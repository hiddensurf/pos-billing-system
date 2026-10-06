from decimal import Decimal

from sqlmodel import select

from app.models.models import LedgerEntry, Product, StockMovement


def sale_body(product, qty=2, **extra):
    body = {
        "items": [{"product_id": product.id, "quantity": qty}],
        "payment_method": "cash",
        "cash_tendered": "1500.00",
    }
    body.update(extra)
    return body


def test_sale_requires_login(client, product):
    assert client.post("/sales", json=sale_body(product)).status_code == 401


def test_staff_can_create_cash_sale(client, staff_headers, product, session):
    r = client.post("/sales", json=sale_body(product), headers=staff_headers)
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["bill_number"].startswith("INV-")
    assert Decimal(data["total_amount"]) == Decimal("1000.00")
    assert Decimal(data["change_due"]) == Decimal("500.00")


def test_sale_reduces_stock_and_writes_movement_and_ledger(
    client, staff_headers, product, session
):
    client.post("/sales", json=sale_body(product, qty=3), headers=staff_headers)
    session.expire_all()
    assert session.get(Product, product.id).stock_quantity == 7
    mv = session.exec(select(StockMovement)).all()
    assert len(mv) == 1 and mv[0].quantity == -3
    ledger = session.exec(select(LedgerEntry)).all()
    assert len(ledger) == 1 and ledger[0].direction == "IN"


def test_sale_with_insufficient_stock_is_409_and_changes_nothing(
    client, staff_headers, product, session
):
    r = client.post("/sales", json=sale_body(product, qty=11), headers=staff_headers)
    assert r.status_code == 409
    session.expire_all()
    assert session.get(Product, product.id).stock_quantity == 10


def test_sale_unknown_product_is_404(client, staff_headers):
    body = {"items": [{"product_id": 9999, "quantity": 1}], "cash_tendered": "10"}
    assert client.post("/sales", json=body, headers=staff_headers).status_code == 404


def test_cash_tendered_below_total_is_400(client, staff_headers, product):
    r = client.post(
        "/sales",
        json=sale_body(product, qty=2, cash_tendered="100.00"),
        headers=staff_headers,
    )
    assert r.status_code == 400


def test_discount_cannot_exceed_subtotal(client, staff_headers, product):
    r = client.post(
        "/sales",
        json=sale_body(product, qty=1, discount="600.00"),
        headers=staff_headers,
    )
    assert r.status_code == 400


def test_discount_is_applied_to_total(client, staff_headers, product):
    r = client.post(
        "/sales",
        json=sale_body(product, qty=2, discount="100.00"),
        headers=staff_headers,
    )
    assert r.status_code == 201
    assert Decimal(r.json()["total_amount"]) == Decimal("900.00")


def test_zero_quantity_rejected_by_validation(client, staff_headers, product):
    r = client.post("/sales", json=sale_body(product, qty=0), headers=staff_headers)
    assert r.status_code == 422
