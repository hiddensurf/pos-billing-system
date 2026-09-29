from datetime import date, datetime, time, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select

from app.auth.dependencies import require_role
from app.db import get_session
from app.models.models import Product, Sale, SaleReturn, User

from app.admin.report_schemas import (
    SalesReport,
    StockReport,
    StockReportItem,
)


router = APIRouter(
    prefix="/admin/reports",
    tags=["Admin - Reports"],
)


@router.get(
    "/sales",
    response_model=SalesReport,
)
def sales_report(
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    session: Session = Depends(get_session),
    current_user: User = Depends(require_role("admin")),
):
    statement = select(Sale)

    if from_date:
        start_datetime = datetime.combine(
            from_date,
            time.min,
            tzinfo=timezone.utc,
        )
        statement = statement.where(
            Sale.created_at >= start_datetime
        )

    if to_date:
        end_datetime = datetime.combine(
            to_date,
            time.max,
            tzinfo=timezone.utc,
        )
        statement = statement.where(
            Sale.created_at <= end_datetime
        )

    sales = session.exec(statement).all()

    completed_sales = [
        sale
        for sale in sales
        if sale.status != "cancelled"
    ]

    total_sales = sum(
        (sale.total_amount for sale in completed_sales),
        Decimal("0.00"),
    )

    returned_sale_count = sum(
        1
        for sale in completed_sales
        if sale.status in {"returned", "partially_returned"}
    )

    return_statement = select(SaleReturn).where(
        SaleReturn.status == "completed"
    )

    if from_date:
        start_datetime = datetime.combine(
            from_date,
            time.min,
            tzinfo=timezone.utc,
        )
        return_statement = return_statement.where(
            SaleReturn.created_at >= start_datetime
        )

    if to_date:
        end_datetime = datetime.combine(
            to_date,
            time.max,
            tzinfo=timezone.utc,
        )
        return_statement = return_statement.where(
            SaleReturn.created_at <= end_datetime
        )

    returns = session.exec(return_statement).all()

    total_refunds = sum(
        (sale_return.refund_amount for sale_return in returns),
        Decimal("0.00"),
    )

    return SalesReport(
        total_sales=total_sales,
        total_refunds=total_refunds,
        net_sales=total_sales - total_refunds,
        sale_count=len(completed_sales),
        returned_sale_count=returned_sale_count,
    )


@router.get(
    "/stock",
    response_model=StockReport,
)
def stock_report(
    session: Session = Depends(get_session),
    current_user: User = Depends(require_role("admin")),
):
    products = session.exec(
        select(Product).order_by(Product.id)
    ).all()

    report_items = []

    for product in products:
        if product.stock_quantity <= 0:
            stock_status = "out_of_stock"
        else:
            stock_status = "in_stock"

        report_items.append(
            StockReportItem(
                product_id=product.id,
                product_name=product.name,
                sku=product.sku,
                current_stock=product.stock_quantity,
                cost_price=product.cost_price,
                selling_price=product.selling_price,
                stock_status=stock_status,
            )
        )

    return StockReport(products=report_items)