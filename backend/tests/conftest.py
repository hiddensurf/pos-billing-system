import os

# Must be set before app modules are imported.
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")

from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel

from app.auth.security import hash_password
from app.db import engine
from app.main import app
from app.models.models import Category, Product, User


@pytest.fixture(autouse=True)
def fresh_db():
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
    yield
    SQLModel.metadata.drop_all(engine)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def session():
    with Session(engine) as s:
        yield s


def _make_user(session, username, password, role, active=True):
    user = User(
        username=username,
        password_hash=hash_password(password),
        full_name=username.title(),
        role=role,
        is_active=active,
    )
    session.add(user)
    session.commit()
    return user


@pytest.fixture
def admin_user(session):
    return _make_user(session, "admin", "admin-pass", "admin")


@pytest.fixture
def staff_user(session):
    return _make_user(session, "staff1", "staff-pass", "staff")


@pytest.fixture
def inactive_user(session):
    return _make_user(session, "gone", "gone-pass", "staff", active=False)


def login(client, username, password):
    return client.post(
        "/auth/login",
        data={"username": username, "password": password},
    )


@pytest.fixture
def admin_headers(client, admin_user):
    token = login(client, "admin", "admin-pass").json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def staff_headers(client, staff_user):
    token = login(client, "staff1", "staff-pass").json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def product(session):
    category = Category(name="Shirts")
    session.add(category)
    session.commit()
    p = Product(
        name="Cotton Shirt",
        sku="SHIRT-001",
        category_id=category.id,
        cost_price=Decimal("300.00"),
        selling_price=Decimal("500.00"),
        stock_quantity=10,
    )
    session.add(p)
    session.commit()
    session.refresh(p)
    return p
