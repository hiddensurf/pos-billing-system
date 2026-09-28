from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, func

from app.admin.supplier_payment_schemas import (
    SupplierDueRead,
    SupplierPaymentCreate,
    SupplierPaymentRead,
)
from app.auth.dependencies import require_role
from app.db import get_session
from app.models.models import (
    LedgerEntry,
    Purchase,
    Supplier,
    SupplierPayment,
    User,
)


router = APIRouter(
    prefix="/admin/supplier-payments",
    tags=["Supplier Payments"],
)


@router.post(
    "",
    response_model=SupplierPaymentRead,
    status_code=status.HTTP_201_CREATED,
)
def create_supplier_payment(
    payment_data: SupplierPaymentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_role("admin")),
):
    supplier = session.get(
        Supplier,
        payment_data.supplier_id,
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

    purchase = None

    if payment_data.purchase_id is not None:
        purchase = session.get(
            Purchase,
            payment_data.purchase_id,
        )

        if purchase is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Purchase not found",
            )

        if purchase.supplier_id != supplier.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Purchase does not belong to this supplier",
            )

        if purchase.status == "cancelled":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot pay a cancelled purchase",
            )

        outstanding = (
            purchase.total_amount - purchase.paid_amount
        )

        if payment_data.amount > outstanding:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Payment amount exceeds purchase "
                    f"outstanding amount of {outstanding}"
                ),
            )

    else:
        # Payment is against the supplier's overall balance.
        purchases = session.exec(
            select(Purchase).where(
                Purchase.supplier_id == supplier.id,
                Purchase.status != "cancelled",
            )
        ).all()

        total_outstanding = sum(
            (
                purchase.total_amount - purchase.paid_amount
                for purchase in purchases
            ),
            Decimal("0.00"),
        )

        # Existing supplier-level payments which have not
        # been allocated to a specific purchase.
        unallocated_payments = session.exec(
            select(SupplierPayment).where(
                SupplierPayment.supplier_id == supplier.id,
                SupplierPayment.purchase_id.is_(None),
            )
        ).all()

        unallocated_total = sum(
            (
                payment.amount
                for payment in unallocated_payments
            ),
            Decimal("0.00"),
        )

        remaining_supplier_due = (
            total_outstanding - unallocated_total
        )

        if payment_data.amount > remaining_supplier_due:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Payment amount exceeds supplier "
                    f"outstanding amount of {remaining_supplier_due}"
                ),
            )

    payment = SupplierPayment(
        supplier_id=supplier.id,
        purchase_id=payment_data.purchase_id,
        amount=payment_data.amount,
        payment_method=payment_data.payment_method,
        payment_date=(
            payment_data.payment_date
            if payment_data.payment_date is not None
            else datetime.now(timezone.utc)
        ),
        reference=payment_data.reference,
        created_by=current_user.id,
        notes=payment_data.notes,
    )

    session.add(payment)
    session.flush()

    if purchase is not None:
        purchase.paid_amount += payment.amount
        session.add(purchase)

    ledger_entry = LedgerEntry(
        entry_type="SUPPLIER_PAYMENT",
        amount=payment.amount,
        direction="OUT",
        reference_type="SUPPLIER_PAYMENT",
        reference_id=payment.id,
        description=f"Payment to supplier {supplier.name}",
        created_by=current_user.id,
    )

    session.add(ledger_entry)

    session.commit()
    session.refresh(payment)

    return SupplierPaymentRead(
        id=payment.id,
        supplier_id=payment.supplier_id,
        purchase_id=payment.purchase_id,
        amount=payment.amount,
        payment_method=payment.payment_method,
        payment_date=payment.payment_date,
        reference=payment.reference,
        created_by=payment.created_by,
        notes=payment.notes,
    )


@router.get(
    "",
    response_model=list[SupplierPaymentRead],
)
def get_supplier_payments(
    session: Session = Depends(get_session),
    _: User = Depends(require_role("admin")),
):
    payments = session.exec(
        select(SupplierPayment).order_by(
            SupplierPayment.id
        )
    ).all()

    return [
        SupplierPaymentRead(
            id=payment.id,
            supplier_id=payment.supplier_id,
            purchase_id=payment.purchase_id,
            amount=payment.amount,
            payment_method=payment.payment_method,
            payment_date=payment.payment_date,
            reference=payment.reference,
            created_by=payment.created_by,
            notes=payment.notes,
        )
        for payment in payments
    ]

@router.get(
    "/supplier/{supplier_id}/dues",
    response_model=SupplierDueRead,
)
def get_supplier_dues(
    supplier_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(require_role("admin")),
):
    supplier = session.get(
        Supplier,
        supplier_id,
    )

    if supplier is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )

    purchases = session.exec(
        select(Purchase).where(
            Purchase.supplier_id == supplier.id,
            Purchase.status != "cancelled",
        )
    ).all()

    total_purchase_amount = sum(
        (
            purchase.total_amount
            for purchase in purchases
        ),
        Decimal("0.00"),
    )

    total_paid_amount = sum(
        (
            purchase.paid_amount
            for purchase in purchases
        ),
        Decimal("0.00"),
    )

    unallocated_payments = session.exec(
        select(SupplierPayment).where(
            SupplierPayment.supplier_id == supplier.id,
            SupplierPayment.purchase_id.is_(None),
        )
    ).all()

    unallocated_total = sum(
        (
            payment.amount
            for payment in unallocated_payments
        ),
        Decimal("0.00"),
    )

    outstanding_amount = (
        total_purchase_amount
        - total_paid_amount
        - unallocated_total
    )

    if outstanding_amount < 0:
        outstanding_amount = Decimal("0.00")

    return SupplierDueRead(
        supplier_id=supplier.id,
        total_purchase_amount=total_purchase_amount,
        total_paid_amount=(
            total_paid_amount + unallocated_total
        ),
        outstanding_amount=outstanding_amount,
    )

@router.get(
    "/{payment_id}",
    response_model=SupplierPaymentRead,
)
def get_supplier_payment(
    payment_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(require_role("admin")),
):
    payment = session.get(
        SupplierPayment,
        payment_id,
    )

    if payment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier payment not found",
        )

    return SupplierPaymentRead(
        id=payment.id,
        supplier_id=payment.supplier_id,
        purchase_id=payment.purchase_id,
        amount=payment.amount,
        payment_method=payment.payment_method,
        payment_date=payment.payment_date,
        reference=payment.reference,
        created_by=payment.created_by,
        notes=payment.notes,
    )


