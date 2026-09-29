from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class SaleItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)
    discount: Decimal = Field(default=Decimal("0.00"), ge=0)


class SaleCreate(BaseModel):
    items: list[SaleItemCreate] = Field(min_length=1)

    discount: Decimal = Field(
        default=Decimal("0.00"),
        ge=0,
    )

    payment_method: str = Field(
        default="cash",
        min_length=1,
        max_length=30,
    )

    cash_tendered: Decimal = Field(
        default=Decimal("0.00"),
        ge=0,
    )
class SaleReturnItemCreate(BaseModel):
    sale_item_id: int
    quantity: int = Field(gt=0)


class SaleReturnCreate(BaseModel):
    items: list[SaleReturnItemCreate] = Field(min_length=1)
    reason: str | None = Field(default=None, max_length=255)

class SaleItemRead(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price: Decimal
    discount: Decimal
    total_amount: Decimal


class SaleRead(BaseModel):
    id: int
    bill_number: str
    staff_id: int
    subtotal: Decimal
    discount: Decimal
    total_amount: Decimal
    payment_method: str
    cash_tendered: Decimal
    change_due: Decimal
    status: str
    created_at: datetime
    items: list[SaleItemRead]