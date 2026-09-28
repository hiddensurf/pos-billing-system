from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    sku: str = Field(min_length=1, max_length=50)
    barcode: str | None = Field(default=None, max_length=100)

    category_id: int
    supplier_id: int | None = None

    cost_price: Decimal = Field(ge=0)
    selling_price: Decimal = Field(ge=0)

    stock_quantity: int = Field(default=0, ge=0)
    reorder_level: int = Field(default=5, ge=0)

    unit: str = Field(default="piece", max_length=20)


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    sku: str | None = Field(default=None, min_length=1, max_length=50)
    barcode: str | None = Field(default=None, max_length=100)

    category_id: int | None = None
    supplier_id: int | None = None

    cost_price: Decimal | None = Field(default=None, ge=0)
    selling_price: Decimal | None = Field(default=None, ge=0)

    stock_quantity: int | None = Field(default=None, ge=0)
    reorder_level: int | None = Field(default=None, ge=0)

    unit: str | None = Field(default=None, max_length=20)


class ProductRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    sku: str
    barcode: str | None

    category_id: int
    supplier_id: int | None

    cost_price: Decimal
    selling_price: Decimal

    stock_quantity: int
    reorder_level: int
    unit: str
