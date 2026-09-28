from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.auth.dependencies import require_role
from app.db import get_session
from app.models.models import Product, User

from app.admin.schemas import (
    ProductCreate,
    ProductRead,
    ProductUpdate,
)


router = APIRouter(
    prefix="/admin/products",
    tags=["Admin - Products"],
)


@router.post(
    "",
    response_model=ProductRead,
    status_code=status.HTTP_201_CREATED,
)
def create_product(
    product_data: ProductCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_role("admin")),
):
    existing_sku = session.exec(
        select(Product).where(Product.sku == product_data.sku)
    ).first()

    if existing_sku:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="SKU already exists",
        )

    if product_data.barcode:
        existing_barcode = session.exec(
            select(Product).where(
                Product.barcode == product_data.barcode
            )
        ).first()

        if existing_barcode:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Barcode already exists",
            )

    product = Product(**product_data.model_dump())

    session.add(product)
    session.commit()
    session.refresh(product)

    return product


@router.get(
    "",
    response_model=list[ProductRead],
)
def list_products(
    session: Session = Depends(get_session),
    current_user: User = Depends(require_role("admin")),
):
    statement = select(Product).order_by(Product.id)
    return session.exec(statement).all()


@router.get(
    "/{product_id}",
    response_model=ProductRead,
)
def get_product(
    product_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_role("admin")),
):
    product = session.get(Product, product_id)

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    return product


@router.put(
    "/{product_id}",
    response_model=ProductRead,
)
def update_product(
    product_id: int,
    product_data: ProductUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_role("admin")),
):
    product = session.get(Product, product_id)

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    update_data = product_data.model_dump(exclude_unset=True)

    if "sku" in update_data:
        existing_sku = session.exec(
            select(Product).where(
                Product.sku == update_data["sku"],
                Product.id != product_id,
            )
        ).first()

        if existing_sku:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="SKU already exists",
            )

    if "barcode" in update_data and update_data["barcode"]:
        existing_barcode = session.exec(
            select(Product).where(
                Product.barcode == update_data["barcode"],
                Product.id != product_id,
            )
        ).first()

        if existing_barcode:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Barcode already exists",
            )

    for field, value in update_data.items():
        setattr(product, field, value)

    session.add(product)
    session.commit()
    session.refresh(product)

    return product


@router.delete(
    "/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_product(
    product_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_role("admin")),
):
    product = session.get(Product, product_id)

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    session.delete(product)
    session.commit()