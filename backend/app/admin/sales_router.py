from decimal import Decimal, ROUND_HALF_UP

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from pydantic import BaseModel
from app.admin.sales_schemas import (
    SaleCreate,
    SaleItemRead,
    SaleRead,
    SaleReturnCreate,
)
from app.auth.dependencies import get_current_user
from app.db import get_session
from app.models.models import (
    LedgerEntry,
    Product,
    Sale,
    SaleItem,
    SaleReturn,
    SaleReturnItem,
    StockMovement,
    User,
)


router = APIRouter(
    prefix="/sales",
    tags=["Sales"],
)

class BillingProductRead(BaseModel):
    id: int
    name: str
    sku: str
    barcode: str | None
    selling_price: Decimal
    stock_quantity: int
    unit: str
@router.get(
    "/products",
    response_model=list[BillingProductRead],
)
def get_billing_products(
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

    products = session.exec(
        select(Product)
        .where(Product.is_active == True)
        .order_by(Product.name)
    ).all()

    return [
        BillingProductRead(
            id=product.id,
            name=product.name,
            sku=product.sku,
            barcode=product.barcode,
            selling_price=product.selling_price,
            stock_quantity=product.stock_quantity,
            unit=product.unit,
        )
        for product in products
    ]  
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

    product_ids = [item.product_id for item in sale_data.items]
    if len(product_ids) != len(set(product_ids)):
        raise HTTPException(status_code=400, detail="Duplicate product lines are not allowed")

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

    item_discount_total = sum((item.discount for item in sale_data.items), Decimal("0.00"))

    if sale_data.discount + item_discount_total > subtotal:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sale discount cannot exceed subtotal",
        )

    total_amount = subtotal - item_discount_total - sale_data.discount

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
@router.post(
    "/{sale_id}/returns",
    status_code=status.HTTP_201_CREATED,
)
def create_sale_return(
    sale_id: int,
    return_data: SaleReturnCreate,
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

    sale = session.get(Sale, sale_id)

    if sale is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sale not found",
        )

    if sale.status in {"cancelled", "returned"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sale is not eligible for return",
        )

    if (
        current_user.role == "staff"
        and sale.staff_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only process returns for your own sales",
        )

    sale_items = session.exec(
        select(SaleItem).where(
            SaleItem.sale_id == sale.id
        )
    ).all()

    sale_items_by_id = {
        item.id: item
        for item in sale_items
    }

    return_ids = [item.sale_item_id for item in return_data.items]
    if len(return_ids) != len(set(return_ids)):
        raise HTTPException(status_code=400, detail="Duplicate return lines are not allowed")

    # Allocate the amount actually charged across sale items in integer cents.
    # Largest remainders distribute rounding cents deterministically, so a full
    # return refunds exactly the sale total, even across separate partial returns.
    cent = Decimal("0.01")
    weights = [item.unit_price * item.quantity - item.discount for item in sale_items]
    weight_total = sum(weights, Decimal("0.00"))
    total_cents = int((sale.total_amount / cent).to_integral_value(rounding=ROUND_HALF_UP))
    raw = [Decimal(total_cents) * w / weight_total for w in weights]
    allocated = [int(value) for value in raw]
    remainder = total_cents - sum(allocated)
    order = sorted(range(len(sale_items)), key=lambda i: (raw[i] - allocated[i], -sale_items[i].id), reverse=True)
    for i in order[:remainder]:
        allocated[i] += 1
    refundable_cents = {item.id: allocated[i] for i, item in enumerate(sale_items)}

    prepared_items = []
    refund_amount = Decimal("0.00")

    for return_item in return_data.items:
        sale_item = sale_items_by_id.get(return_item.sale_item_id)

        if sale_item is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=(
                    f"Sale item {return_item.sale_item_id} "
                    f"not found in sale"
                ),
            )

        previous_returns = session.exec(
            select(SaleReturnItem).where(
                SaleReturnItem.sale_item_id == sale_item.id
            )
        ).all()

        returned_quantity = sum(
            item.quantity
            for item in previous_returns
        )

        remaining_quantity = (
            sale_item.quantity - returned_quantity
        )

        if return_item.quantity > remaining_quantity:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Cannot return {return_item.quantity} units "
                    f"of sale item {sale_item.id}. "
                    f"Remaining returnable quantity: "
                    f"{remaining_quantity}"
                ),
            )

        # Use cumulative rounding and subtract prior refunds. The last unit
        # receives any residual cent; repeated partial returns cannot over-refund.
        cumulative_qty = returned_quantity + return_item.quantity
        cumulative_cents = int((Decimal(refundable_cents[sale_item.id]) * cumulative_qty / sale_item.quantity).to_integral_value(rounding=ROUND_HALF_UP))
        refunded_before = sum((item.refund_amount for item in previous_returns), Decimal("0.00"))
        item_refund = Decimal(cumulative_cents) * cent - refunded_before
        if item_refund < 0:
            raise HTTPException(status_code=409, detail="Existing refunds exceed the refundable balance")

        prepared_items.append(
            (
                return_item,
                sale_item,
                item_refund,
            )
        )

        refund_amount += item_refund

    if refund_amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Refund amount must be greater than zero",
        )

    sale_return = SaleReturn(
        sale_id=sale.id,
        processed_by=current_user.id,
        refund_amount=refund_amount,
        reason=return_data.reason,
        status="completed",
    )

    session.add(sale_return)
    session.flush()

    for return_item, sale_item, item_refund in prepared_items:
        product = session.get(
            Product,
            sale_item.product_id,
        )

        if product is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=(
                    f"Product {sale_item.product_id} not found"
                ),
            )

        stock_before = product.stock_quantity
        stock_after = (
            stock_before + return_item.quantity
        )

        product.stock_quantity = stock_after

        return_item_record = SaleReturnItem(
            sale_return_id=sale_return.id,
            sale_item_id=sale_item.id,
            product_id=product.id,
            quantity=return_item.quantity,
            unit_price=sale_item.unit_price,
            refund_amount=item_refund,
        )

        movement = StockMovement(
            product_id=product.id,
            movement_type="RETURN",
            quantity=return_item.quantity,
            stock_before=stock_before,
            stock_after=stock_after,
            reference_type="SALE_RETURN",
            reference_id=sale_return.id,
            created_by=current_user.id,
        )

        session.add(product)
        session.add(return_item_record)
        session.add(movement)

    total_returned_quantity = 0
    total_sale_quantity = 0

    for sale_item in sale_items:
        previous_returns = session.exec(
            select(SaleReturnItem).where(
                SaleReturnItem.sale_item_id == sale_item.id
            )
        ).all()

        total_returned_quantity += (
            sum(item.quantity for item in previous_returns)
        )
        total_sale_quantity += sale_item.quantity

    if total_returned_quantity >= total_sale_quantity:
        sale.status = "returned"
    else:
        sale.status = "partially_returned"

    ledger_entry = LedgerEntry(
        entry_type="SALE_RETURN",
        amount=refund_amount,
        direction="OUT",
        reference_type="SALE_RETURN",
        reference_id=sale_return.id,
        description=f"Return for sale {sale.bill_number}",
        created_by=current_user.id,
    )

    session.add(sale)
    session.add(ledger_entry)

    session.commit()
    session.refresh(sale_return)

    return {
        "id": sale_return.id,
        "sale_id": sale_return.sale_id,
        "refund_amount": sale_return.refund_amount,
        "reason": sale_return.reason,
        "status": sale_return.status,
        "created_at": sale_return.created_at,
    }