def test_admin_product_list_forbidden_for_staff(client, staff_headers):
    assert client.get("/admin/products", headers=staff_headers).status_code == 403


def test_admin_product_list_requires_login(client):
    assert client.get("/admin/products").status_code == 401


def test_admin_can_list_products(client, admin_headers, product):
    r = client.get("/admin/products", headers=admin_headers)
    assert r.status_code == 200
