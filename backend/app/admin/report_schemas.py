from decimal import Decimal

from pydantic import BaseModel


class SalesReport(BaseModel):
    total_sales: Decimal
    total_refunds: Decimal
    net_sales: Decimal
    sale_count: int
    returned_sale_count: int


class StockReportItem(BaseModel):
    product_id: int
    product_name: str
    sku: str
    current_stock: int
    cost_price: Decimal
    selling_price: Decimal
    stock_status: str


class StockReport(BaseModel):
    products: list[StockReportItem]