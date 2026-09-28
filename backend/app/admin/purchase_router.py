from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.admin.purchase_schemas import (
    PurchaseCreate,
    PurchaseItemRead,
    PurchaseRead,
)
from app.auth.dependencies import require_role
from app.db import get_session
from app.models.models import (
    LedgerEntry,
    Product,
    Purchase,
    PurchaseItem,
    StockMovement,
    Supplier,
    User,
)


router = APIRouter(
    prefix="/admin/purchases",
    tags=["Purchases"],
)


@router.post(
    "",
    response_model=PurchaseRead,
    status_code=status.HTTP_201_CREATED,
)
def create_purchase(
    purchase_data: PurchaseCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_role("admin")),
):
    supplier = session.get(
        Supplier,
        purchase_data.supplier_id,
    )

    if supplier is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )

    if not supplier.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Supplier is inactive",
        )

    if purchase_data.paid_amount < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Paid amount cannot be negative",
        )

    # Create the purchase first so PostgreSQL generates purchase.id.
    purchase = Purchase(
        supplier_id=purchase_data.supplier_id,
        created_by=current_user.id,
        invoice_number=purchase_data.invoice_number,
        purchase_date=(
            purchase_data.purchase_date
            if purchase_data.purchase_date is not None
            else datetime.now(timezone.utc)
        ),
        paid_amount=purchase_data.paid_amount,
        notes=purchase_data.notes,
        status="completed",
    )

    session.add(purchase)
    session.flush()

    total_amount = Decimal("0.00")
    purchase_items = []

    # Validate products and prepare purchase items.
    for item_data in purchase_data.items:
        product = session.get(
            Product,
            item_data.product_id,
        )

        if product is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=(
                    f"Product {item_data.product_id} not found"
                ),
            )

        if not product.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Product {item_data.product_id} is inactive"
                ),
            )

        total_cost = (
            item_data.unit_cost * item_data.quantity
        )

        total_amount += total_cost

        purchase_item = PurchaseItem(
            purchase_id=purchase.id,
            product_id=item_data.product_id,
            quantity=item_data.quantity,
            unit_cost=item_data.unit_cost,
            total_cost=total_cost,
        )

        purchase_items.append(
            (purchase_item, product)
        )

    if purchase_data.paid_amount > total_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Paid amount cannot exceed purchase total",
        )

    purchase.total_amount = total_amount

    # Update stock and create stock movements.
    for purchase_item, product in purchase_items:
        stock_before = product.stock_quantity
        stock_after = (
            stock_before + purchase_item.quantity
        )

        product.stock_quantity = stock_after

        movement = StockMovement(
            product_id=product.id,
            movement_type="PURCHASE",
            quantity=purchase_item.quantity,
            stock_before=stock_before,
            stock_after=stock_after,
            reference_type="PURCHASE",
            reference_id=purchase.id,
            created_by=current_user.id,
        )

        session.add(product)
        session.add(purchase_item)
        session.add(movement)

    # Record the purchase in the ledger.
    if purchase.total_amount > 0:
        ledger_entry = LedgerEntry(
            entry_type="PURCHASE",
            amount=purchase.total_amount,
            direction="OUT",
            reference_type="PURCHASE",
            reference_id=purchase.id,
            description=(
                f"Purchase from supplier "
                f"{supplier.name}"
            ),
            created_by=current_user.id,
        )

        session.add(ledger_entry)

    session.commit()
    session.refresh(purchase)

    items = session.exec(
        select(PurchaseItem).where(
            PurchaseItem.purchase_id == purchase.id
        )
    ).all()

    return PurchaseRead(
        id=purchase.id,
        supplier_id=purchase.supplier_id,
        created_by=purchase.created_by,
        invoice_number=purchase.invoice_number,
        purchase_date=purchase.purchase_date,
        total_amount=purchase.total_amount,
        paid_amount=purchase.paid_amount,
        status=purchase.status,
        notes=purchase.notes,
        created_at=purchase.created_at,
        items=[
            PurchaseItemRead(
                id=item.id,
                product_id=item.product_id,
                quantity=item.quantity,
                unit_cost=item.unit_cost,
                total_cost=item.total_cost,
            )
            for item in items
        ],
    )


@router.get(
    "",
    response_model=list[PurchaseRead],
)
def get_purchases(
    session: Session = Depends(get_session),
    _: User = Depends(require_role("admin")),
):
    purchases = session.exec(
        select(Purchase).order_by(Purchase.id)
    ).all()

    result = []

    for purchase in purchases:
        items = session.exec(
            select(PurchaseItem).where(
                PurchaseItem.purchase_id == purchase.id
            )
        ).all()

        result.append(
            PurchaseRead(
                id=purchase.id,
                supplier_id=purchase.supplier_id,
                created_by=purchase.created_by,
                invoice_number=purchase.invoice_number,
                purchase_date=purchase.purchase_date,
                total_amount=purchase.total_amount,
                paid_amount=purchase.paid_amount,
                status=purchase.status,
                notes=purchase.notes,
                created_at=purchase.created_at,
                items=[
                    PurchaseItemRead(
                        id=item.id,
                        product_id=item.product_id,
                        quantity=item.quantity,
                        unit_cost=item.unit_cost,
                        total_cost=item.total_cost,
                    )
                    for item in items
                ],
            )
        )

    return result


@router.get(
    "/{purchase_id}",
    response_model=PurchaseRead,
)
def get_purchase(
    purchase_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(require_role("admin")),
):
    purchase = session.get(
        Purchase,
        purchase_id,
    )

    if purchase is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase not found",
        )

    items = session.exec(
        select(PurchaseItem).where(
            PurchaseItem.purchase_id == purchase.id
        )
    ).all()

    return PurchaseRead(
        id=purchase.id,
        supplier_id=purchase.supplier_id,
        created_by=purchase.created_by,
        invoice_number=purchase.invoice_number,
        purchase_date=purchase.purchase_date,
        total_amount=purchase.total_amount,
        paid_amount=purchase.paid_amount,
        status=purchase.status,
        notes=purchase.notes,
        created_at=purchase.created_at,
        items=[
            PurchaseItemRead(
                id=item.id,
                product_id=item.product_id,
                quantity=item.quantity,
                unit_cost=item.unit_cost,
                total_cost=item.total_cost,
            )
            for item in items
        ],
    )