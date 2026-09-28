from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.admin.sales_schemas import (
    SaleCreate,
    SaleItemRead,
    SaleRead,
)
from app.auth.dependencies import get_current_user
from app.db import get_session
from app.models.models import (
    LedgerEntry,
    Product,
    Sale,
    SaleItem,
    StockMovement,
    User,
)


router = APIRouter(
    prefix="/sales",
    tags=["Sales"],
)


@router.post(
    "",
    response_model=SaleRead,
    status_code=status.HTTP_201_CREATED,
)
def create_sale(
    sale_data: SaleCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in {"admin", "staff"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
        )

    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )

    if sale_data.discount < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Discount cannot be negative",
        )

    prepared_items = []
    subtotal = Decimal("0.00")

    for item_data in sale_data.items:
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


        if item_data.quantity > product.stock_quantity:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Insufficient stock for product "
                    f"{product.id}. Available: "
                    f"{product.stock_quantity}, "
                    f"requested: {item_data.quantity}"
                ),
            )

        if item_data.discount > (
            product.selling_price * item_data.quantity
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Item discount exceeds item value "
                    f"for product {product.id}"
                ),
            )

        item_subtotal = (
            product.selling_price * item_data.quantity
        )

        item_total = (
            item_subtotal - item_data.discount
        )

        subtotal += item_subtotal

        prepared_items.append(
            (
                item_data,
                product,
                item_total,
            )
        )

    if sale_data.discount > subtotal:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sale discount cannot exceed subtotal",
        )

    total_amount = subtotal - sale_data.discount

    if total_amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sale total must be greater than zero",
        )

    payment_method = sale_data.payment_method.lower()

    if payment_method == "cash":
        if sale_data.cash_tendered < total_amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cash tendered is less than sale total",
            )

        cash_tendered = sale_data.cash_tendered
        change_due = cash_tendered - total_amount

    else:
        cash_tendered = Decimal("0.00")
        change_due = Decimal("0.00")

    sale = Sale(
        bill_number="PENDING",
        staff_id=current_user.id,
        subtotal=subtotal,
        discount=sale_data.discount,
        total_amount=total_amount,
        payment_method=payment_method,
        cash_tendered=cash_tendered,
        change_due=change_due,
        status="completed",
    )

    session.add(sale)
    session.flush()

    sale.bill_number = f"INV-{sale.id:06d}"

    session.add(sale)

    for item_data, product, item_total in prepared_items:
        stock_before = product.stock_quantity
        stock_after = (
            stock_before - item_data.quantity
        )

        product.stock_quantity = stock_after

        sale_item = SaleItem(
            sale_id=sale.id,
            product_id=product.id,
            quantity=item_data.quantity,
            unit_price=product.selling_price,
            discount=item_data.discount,
            total_amount=item_total,
        )

        movement = StockMovement(
            product_id=product.id,
            movement_type="SALE",
            quantity=-item_data.quantity,
            stock_before=stock_before,
            stock_after=stock_after,
            reference_type="SALE",
            reference_id=sale.id,
            created_by=current_user.id,
        )

        session.add(product)
        session.add(sale_item)
        session.add(movement)

    ledger_entry = LedgerEntry(
        entry_type="SALE",
        amount=total_amount,
        direction="IN",
        reference_type="SALE",
        reference_id=sale.id,
        description=f"Sale {sale.bill_number}",
        created_by=current_user.id,
    )

    session.add(ledger_entry)

    session.commit()
    session.refresh(sale)

    items = session.exec(
        select(SaleItem).where(
            SaleItem.sale_id == sale.id
        )
    ).all()

    return SaleRead(
        id=sale.id,
        bill_number=sale.bill_number,
        staff_id=sale.staff_id,
        subtotal=sale.subtotal,
        discount=sale.discount,
        total_amount=sale.total_amount,
        payment_method=sale.payment_method,
        cash_tendered=sale.cash_tendered,
        change_due=sale.change_due,
        status=sale.status,
        created_at=sale.created_at,
        items=[
            SaleItemRead(
                id=item.id,
                product_id=item.product_id,
                quantity=item.quantity,
                unit_price=item.unit_price,
                discount=item.discount,
                total_amount=item.total_amount,
            )
            for item in items
        ],
    )


@router.get(
    "",
    response_model=list[SaleRead],
)
def get_sales(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )

    statement = select(Sale).order_by(Sale.id)

    if current_user.role == "staff":
        statement = statement.where(
            Sale.staff_id == current_user.id
        )

    elif current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
        )

    sales = session.exec(statement).all()

    result = []

    for sale in sales:
        items = session.exec(
            select(SaleItem).where(
                SaleItem.sale_id == sale.id
            )
        ).all()

        result.append(
            SaleRead(
                id=sale.id,
                bill_number=sale.bill_number,
                staff_id=sale.staff_id,
                subtotal=sale.subtotal,
                discount=sale.discount,
                total_amount=sale.total_amount,
                payment_method=sale.payment_method,
                cash_tendered=sale.cash_tendered,
                change_due=sale.change_due,
                status=sale.status,
                created_at=sale.created_at,
                items=[
                    SaleItemRead(
                        id=item.id,
                        product_id=item.product_id,
                        quantity=item.quantity,
                        unit_price=item.unit_price,
                        discount=item.discount,
                        total_amount=item.total_amount,
                    )
                    for item in items
                ],
            )
        )

    return result


@router.get(
    "/{sale_id}",
    response_model=SaleRead,
)
def get_sale(
    sale_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )

    sale = session.get(Sale, sale_id)

    if sale is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sale not found",
        )

    if (
        current_user.role == "staff"
        and sale.staff_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own sales",
        )

    if current_user.role not in {"admin", "staff"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
        )

    items = session.exec(
        select(SaleItem).where(
            SaleItem.sale_id == sale.id
        )
    ).all()

    return SaleRead(
        id=sale.id,
        bill_number=sale.bill_number,
        staff_id=sale.staff_id,
        subtotal=sale.subtotal,
        discount=sale.discount,
        total_amount=sale.total_amount,
        payment_method=sale.payment_method,
        cash_tendered=sale.cash_tendered,
        change_due=sale.change_due,
        status=sale.status,
        created_at=sale.created_at,
        items=[
            SaleItemRead(
                id=item.id,
                product_id=item.product_id,
                quantity=item.quantity,
                unit_price=item.unit_price,
                discount=item.discount,
                total_amount=item.total_amount,
            )
            for item in items
        ],
    )