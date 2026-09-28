from datetime import datetime, timezone
from decimal import Decimal

from sqlmodel import Field, SQLModel
from sqlalchemy import Column, Numeric


def utc_now():
    return datetime.now(timezone.utc)


# ============================================================
# USER
# ============================================================

class User(SQLModel, table=True):
    __tablename__ = "users"

    id: int | None = Field(default=None, primary_key=True)

    username: str = Field(index=True, unique=True, max_length=50)
    password_hash: str
    full_name: str = Field(max_length=100)

    # "admin" or "staff"
    role: str = Field(default="staff", max_length=20)

    is_active: bool = Field(default=True)

    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


# ============================================================
# CATEGORY
# ============================================================

class Category(SQLModel, table=True):
    __tablename__ = "categories"

    id: int | None = Field(default=None, primary_key=True)

    name: str = Field(index=True, unique=True, max_length=100)
    description: str | None = None

    is_active: bool = Field(default=True)

    created_at: datetime = Field(default_factory=utc_now)


# ============================================================
# SUPPLIER
# ============================================================

class Supplier(SQLModel, table=True):
    __tablename__ = "suppliers"

    id: int | None = Field(default=None, primary_key=True)

    name: str = Field(index=True, max_length=150)
    contact_person: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=30)
    email: str | None = Field(default=None, max_length=150)
    address: str | None = None

    is_active: bool = Field(default=True)

    created_at: datetime = Field(default_factory=utc_now)


# ============================================================
# PRODUCT
# ============================================================

class Product(SQLModel, table=True):
    __tablename__ = "products"

    id: int | None = Field(default=None, primary_key=True)

    name: str = Field(index=True, max_length=150)

    sku: str = Field(index=True, unique=True, max_length=50)
    barcode: str | None = Field(
        default=None,
        index=True,
        unique=True,
        max_length=100,
    )

    category_id: int = Field(foreign_key="categories.id", index=True)

    # Optional default supplier.
    # Actual purchases can still come from different suppliers.
    supplier_id: int | None = Field(
        default=None,
        foreign_key="suppliers.id",
        index=True,
    )

    cost_price: Decimal = Field(
        default=Decimal("0.00"),
        sa_column=Column(Numeric(12, 2), nullable=False),
    )

    selling_price: Decimal = Field(
        default=Decimal("0.00"),
        sa_column=Column(Numeric(12, 2), nullable=False),
    )

    stock_quantity: int = Field(default=0, ge=0)
    reorder_level: int = Field(default=5, ge=0)

    # Examples: piece, meter
    unit: str = Field(default="piece", max_length=20)

    is_active: bool = Field(default=True)

    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


# ============================================================
# PURCHASE
# ============================================================

class Purchase(SQLModel, table=True):
    __tablename__ = "purchases"

    id: int | None = Field(default=None, primary_key=True)

    supplier_id: int = Field(foreign_key="suppliers.id", index=True)
    created_by: int = Field(foreign_key="users.id", index=True)

    invoice_number: str | None = Field(
        default=None,
        max_length=100,
    )

    purchase_date: datetime = Field(default_factory=utc_now)

    total_amount: Decimal = Field(
        default=Decimal("0.00"),
        sa_column=Column(Numeric(12, 2), nullable=False),
    )

    paid_amount: Decimal = Field(
        default=Decimal("0.00"),
        sa_column=Column(Numeric(12, 2), nullable=False),
    )

    # "completed" or "cancelled"
    status: str = Field(default="completed", max_length=20)

    notes: str | None = None

    created_at: datetime = Field(default_factory=utc_now)


# ============================================================
# PURCHASE ITEM
# ============================================================

class PurchaseItem(SQLModel, table=True):
    __tablename__ = "purchase_items"

    id: int | None = Field(default=None, primary_key=True)

    purchase_id: int = Field(
        foreign_key="purchases.id",
        index=True,
    )

    product_id: int = Field(
        foreign_key="products.id",
        index=True,
    )

    quantity: int = Field(gt=0)

    unit_cost: Decimal = Field(
        sa_column=Column(Numeric(12, 2), nullable=False),
    )

    total_cost: Decimal = Field(
        sa_column=Column(Numeric(12, 2), nullable=False),
    )


# ============================================================
# SUPPLIER PAYMENT
# ============================================================

class SupplierPayment(SQLModel, table=True):
    __tablename__ = "supplier_payments"

    id: int | None = Field(default=None, primary_key=True)

    supplier_id: int = Field(
        foreign_key="suppliers.id",
        index=True,
    )

    # Nullable because a payment can be made against
    # a supplier's overall outstanding balance.
    purchase_id: int | None = Field(
        default=None,
        foreign_key="purchases.id",
        index=True,
    )

    amount: Decimal = Field(
        sa_column=Column(Numeric(12, 2), nullable=False),
    )

    payment_method: str = Field(
        default="cash",
        max_length=30,
    )

    payment_date: datetime = Field(default_factory=utc_now)

    reference: str | None = Field(
        default=None,
        max_length=100,
    )

    created_by: int = Field(
        foreign_key="users.id",
        index=True,
    )

    notes: str | None = None


# ============================================================
# SALE
# ============================================================

class Sale(SQLModel, table=True):
    __tablename__ = "sales"

    id: int | None = Field(default=None, primary_key=True)

    # Generated after the sale ID exists.
    # Example: INV-000001
    bill_number: str = Field(
        index=True,
        unique=True,
        max_length=30,
    )

    staff_id: int = Field(
        foreign_key="users.id",
        index=True,
    )

    subtotal: Decimal = Field(
        default=Decimal("0.00"),
        sa_column=Column(Numeric(12, 2), nullable=False),
    )

    discount: Decimal = Field(
        default=Decimal("0.00"),
        sa_column=Column(Numeric(12, 2), nullable=False),
    )

    total_amount: Decimal = Field(
        default=Decimal("0.00"),
        sa_column=Column(Numeric(12, 2), nullable=False),
    )

    payment_method: str = Field(
        default="cash",
        max_length=30,
    )

    cash_tendered: Decimal = Field(
        default=Decimal("0.00"),
        sa_column=Column(Numeric(12, 2), nullable=False),
    )

    change_due: Decimal = Field(
        default=Decimal("0.00"),
        sa_column=Column(Numeric(12, 2), nullable=False),
    )

    # "completed", "partially_returned", "returned", "cancelled"
    status: str = Field(
        default="completed",
        max_length=30,
    )

    created_at: datetime = Field(default_factory=utc_now)


# ============================================================
# SALE ITEM
# ============================================================

class SaleItem(SQLModel, table=True):
    __tablename__ = "sale_items"

    id: int | None = Field(default=None, primary_key=True)

    sale_id: int = Field(
        foreign_key="sales.id",
        index=True,
    )

    product_id: int = Field(
        foreign_key="products.id",
        index=True,
    )

    quantity: int = Field(gt=0)

    # Snapshot of the selling price at the time of sale.
    unit_price: Decimal = Field(
        sa_column=Column(Numeric(12, 2), nullable=False),
    )

    discount: Decimal = Field(
        default=Decimal("0.00"),
        sa_column=Column(Numeric(12, 2), nullable=False),
    )

    total_amount: Decimal = Field(
        sa_column=Column(Numeric(12, 2), nullable=False),
    )


# ============================================================
# SALE RETURN
# ============================================================

class SaleReturn(SQLModel, table=True):
    __tablename__ = "sale_returns"

    id: int | None = Field(default=None, primary_key=True)

    sale_id: int = Field(
        foreign_key="sales.id",
        index=True,
    )

    processed_by: int = Field(
        foreign_key="users.id",
        index=True,
    )

    refund_amount: Decimal = Field(
        default=Decimal("0.00"),
        sa_column=Column(Numeric(12, 2), nullable=False),
    )

    reason: str | None = None

    # "completed" or "cancelled"
    status: str = Field(
        default="completed",
        max_length=20,
    )

    created_at: datetime = Field(default_factory=utc_now)


# ============================================================
# SALE RETURN ITEM
# ============================================================

class SaleReturnItem(SQLModel, table=True):
    __tablename__ = "sale_return_items"

    id: int | None = Field(default=None, primary_key=True)

    sale_return_id: int = Field(
        foreign_key="sale_returns.id",
        index=True,
    )

    sale_item_id: int = Field(
        foreign_key="sale_items.id",
        index=True,
    )

    product_id: int = Field(
        foreign_key="products.id",
        index=True,
    )

    quantity: int = Field(gt=0)

    unit_price: Decimal = Field(
        sa_column=Column(Numeric(12, 2), nullable=False),
    )

    refund_amount: Decimal = Field(
        sa_column=Column(Numeric(12, 2), nullable=False),
    )


# ============================================================
# STOCK MOVEMENT
# ============================================================

class StockMovement(SQLModel, table=True):
    __tablename__ = "stock_movements"

    id: int | None = Field(default=None, primary_key=True)

    product_id: int = Field(
        foreign_key="products.id",
        index=True,
    )

    # PURCHASE / SALE / RETURN / ADJUSTMENT
    movement_type: str = Field(
        max_length=30,
    )

    # Positive quantity for stock-in.
    # Negative quantity for stock-out.
    quantity: int

    stock_before: int
    stock_after: int

    # SALE / PURCHASE / SALE_RETURN / ADJUSTMENT
    reference_type: str = Field(
        max_length=30,
    )

    reference_id: int | None = Field(default=None)

    created_by: int = Field(
        foreign_key="users.id",
        index=True,
    )

    created_at: datetime = Field(default_factory=utc_now)


# ============================================================
# LEDGER ENTRY
# ============================================================

class LedgerEntry(SQLModel, table=True):
    __tablename__ = "ledger_entries"

    id: int | None = Field(default=None, primary_key=True)

    # SALE / PURCHASE / SALE_RETURN / SUPPLIER_PAYMENT
    entry_type: str = Field(
        max_length=30,
        index=True,
    )

    amount: Decimal = Field(
        sa_column=Column(Numeric(12, 2), nullable=False),
    )

    # IN = money received
    # OUT = money paid/refunded
    direction: str = Field(
        max_length=10,
    )

    # SALE / PURCHASE / SALE_RETURN / SUPPLIER_PAYMENT
    reference_type: str = Field(
        max_length=30,
    )

    reference_id: int | None = Field(default=None)

    description: str | None = None

    created_by: int = Field(
        foreign_key="users.id",
        index=True,
    )

    created_at: datetime = Field(default_factory=utc_now)