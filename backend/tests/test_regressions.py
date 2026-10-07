from decimal import Decimal
from sqlmodel import select
from app.models.models import Product, Supplier, Purchase, SupplierPayment, LedgerEntry


def make_sale(client, headers, product, qty=2, discount='100'):
    r = client.post('/sales', headers=headers, json={'items':[{'product_id':product.id,'quantity':qty}], 'discount':discount,'cash_tendered':'5000'})
    assert r.status_code == 201, r.text
    return r.json()


def test_full_discounted_return_refunds_only_amount_charged(client,staff_headers,product,session):
    sale=make_sale(client,staff_headers,product)
    r=client.post(f"/sales/{sale['id']}/returns",headers=staff_headers,json={'items':[{'sale_item_id':sale['items'][0]['id'],'quantity':2}]})
    assert r.status_code == 201, r.text
    assert Decimal(str(r.json()['refund_amount'])) == Decimal(sale['total_amount']) == Decimal('900')
    session.expire_all()
    assert session.get(Product,product.id).stock_quantity == 10


def test_partial_discounted_returns_sum_to_sale_total(client,staff_headers,product):
    sale=make_sale(client,staff_headers,product,qty=3,discount='100.01')
    refunds=[]
    for _ in range(3):
        r=client.post(f"/sales/{sale['id']}/returns",headers=staff_headers,json={'items':[{'sale_item_id':sale['items'][0]['id'],'quantity':1}]})
        assert r.status_code == 201,r.text
        refunds.append(Decimal(str(r.json()['refund_amount'])))
    assert sum(refunds) == Decimal(sale['total_amount'])


def test_duplicate_sale_lines_rejected_without_stock_or_ledger_change(client,staff_headers,product,session):
    r=client.post('/sales',headers=staff_headers,json={'items':[{'product_id':product.id,'quantity':6},{'product_id':product.id,'quantity':6}],'cash_tendered':'6000'})
    assert r.status_code == 400
    session.expire_all()
    assert session.get(Product,product.id).stock_quantity == 10
    assert session.exec(select(LedgerEntry)).all() == []


def test_duplicate_return_lines_rejected(client,staff_headers,product,session):
    sale=make_sale(client,staff_headers,product)
    item={'sale_item_id':sale['items'][0]['id'],'quantity':2}
    r=client.post(f"/sales/{sale['id']}/returns",headers=staff_headers,json={'items':[item,item]})
    assert r.status_code == 400
    session.expire_all()
    assert session.get(Product,product.id).stock_quantity == 8


def test_item_discount_and_sale_discount_both_reduce_charge(client,staff_headers,product):
    r=client.post('/sales',headers=staff_headers,json={'items':[{'product_id':product.id,'quantity':2,'discount':'50'}],'discount':'100','cash_tendered':'1000'})
    assert r.status_code == 201,r.text
    assert Decimal(r.json()['total_amount']) == Decimal('850')
    d=r.json()
    ret=client.post(f"/sales/{d['id']}/returns",headers=staff_headers,json={'items':[{'sale_item_id':d['items'][0]['id'],'quantity':2}]})
    assert Decimal(str(ret.json()['refund_amount'])) == Decimal('850')


def test_supplier_summary_empty_and_role_guard(client,admin_headers,staff_headers):
    r=client.get('/admin/supplier-payments/summary',headers=admin_headers)
    assert r.status_code == 200
    assert Decimal(str(r.json()['outstanding_amount'])) == 0
    assert r.json()['supplier_count'] == 0
    assert client.get('/admin/supplier-payments/summary',headers=staff_headers).status_code == 403


def test_supplier_summary_aggregates_all_ids_and_payment_types(client,admin_headers,admin_user,session):
    a=Supplier(id=7,name='Supplier A');b=Supplier(id=12,name='Supplier B')
    session.add(a);session.add(b);session.commit()
    session.add(Purchase(supplier_id=7,created_by=admin_user.id,total_amount=Decimal('100'),paid_amount=Decimal('30')))
    session.add(Purchase(supplier_id=12,created_by=admin_user.id,total_amount=Decimal('200'),paid_amount=Decimal('50')))
    session.add(Purchase(supplier_id=12,created_by=admin_user.id,total_amount=Decimal('999'),status='cancelled'))
    session.add(SupplierPayment(supplier_id=7,created_by=admin_user.id,amount=Decimal('20')))
    session.commit()
    r=client.get('/admin/supplier-payments/summary',headers=admin_headers)
    assert r.status_code == 200,r.text
    assert Decimal(str(r.json()['outstanding_amount'])) == Decimal('200')
    assert r.json()['supplier_count'] == 2
