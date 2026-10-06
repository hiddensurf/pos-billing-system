from tests.conftest import login


def test_login_success_returns_bearer_token(client, admin_user):
    r = login(client, "admin", "admin-pass")
    assert r.status_code == 200
    assert r.json()["token_type"] == "bearer"
    assert r.json()["access_token"]


def test_login_wrong_password_is_401(client, admin_user):
    assert login(client, "admin", "wrong").status_code == 401


def test_login_unknown_user_is_401(client):
    assert login(client, "nobody", "x").status_code == 401


def test_login_inactive_user_is_403(client, inactive_user):
    assert login(client, "gone", "gone-pass").status_code == 403


def test_me_requires_token(client):
    assert client.get("/auth/me").status_code == 401


def test_me_rejects_garbage_token(client):
    r = client.get("/auth/me", headers={"Authorization": "Bearer not-a-jwt"})
    assert r.status_code == 401


def test_me_returns_current_user(client, staff_headers):
    r = client.get("/auth/me", headers=staff_headers)
    assert r.status_code == 200
    assert r.json()["username"] == "staff1"
    assert r.json()["role"] == "staff"
    assert "password_hash" not in r.json()
