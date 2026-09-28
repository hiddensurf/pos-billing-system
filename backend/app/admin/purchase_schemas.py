from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class PurchaseItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)
    unit_cost: Decimal = Field(ge=0)


class PurchaseCreate(BaseModel):
    supplier_id: int
    invoice_number: str | None = Field(
        default=None,
        max_length=100,
    )
    purchase_date: datetime | None = None
    paid_amount: Decimal = Field(
        default=Decimal("0.00"),
        ge=0,
    )
    notes: str | None = None
    items: list[PurchaseItemCreate] = Field(
        min_length=1,
    )


class PurchaseItemRead(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_cost: Decimal
    total_cost: Decimal


class PurchaseRead(BaseModel):
    id: int
    supplier_id: int
    created_by: int
    invoice_number: str | None
    purchase_date: datetime
    total_amount: Decimal
    paid_amount: Decimal
    status: str
    notes: str | None
    created_at: datetime
    items: list[PurchaseItemRead]