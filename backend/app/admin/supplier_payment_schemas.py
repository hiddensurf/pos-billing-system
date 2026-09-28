from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class SupplierPaymentCreate(BaseModel):
    supplier_id: int
    purchase_id: int | None = None

    amount: Decimal = Field(gt=0)

    payment_method: str = Field(
        default="cash",
        max_length=30,
    )

    payment_date: datetime | None = None

    reference: str | None = Field(
        default=None,
        max_length=100,
    )

    notes: str | None = None


class SupplierPaymentRead(BaseModel):
    id: int
    supplier_id: int
    purchase_id: int | None
    amount: Decimal
    payment_method: str
    payment_date: datetime
    reference: str | None
    created_by: int
    notes: str | None


class SupplierDueRead(BaseModel):
    supplier_id: int
    total_purchase_amount: Decimal
    total_paid_amount: Decimal
    outstanding_amount: Decimal