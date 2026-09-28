from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.admin.category_schemas import (
    CategoryCreate,
    CategoryRead,
    CategoryUpdate,
)
from app.auth.dependencies import require_role
from app.db import get_session
from app.models.models import Category, Product, User


router = APIRouter(
    prefix="/admin/categories",
    tags=["Admin - Categories"],
)


@router.post(
    "",
    response_model=CategoryRead,
    status_code=status.HTTP_201_CREATED,
)
def create_category(
    category_data: CategoryCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_role("admin")),
):
    existing_category = session.exec(
        select(Category).where(
            Category.name == category_data.name
        )
    ).first()

    if existing_category:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Category already exists",
        )

    category = Category(**category_data.model_dump())

    session.add(category)
    session.commit()
    session.refresh(category)

    return category


@router.get(
    "",
    response_model=list[CategoryRead],
)
def list_categories(
    session: Session = Depends(get_session),
    current_user: User = Depends(require_role("admin")),
):
    statement = select(Category).order_by(Category.id)

    return session.exec(statement).all()


@router.get(
    "/{category_id}",
    response_model=CategoryRead,
)
def get_category(
    category_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_role("admin")),
):
    category = session.get(Category, category_id)

    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    return category


@router.put(
    "/{category_id}",
    response_model=CategoryRead,
)
def update_category(
    category_id: int,
    category_data: CategoryUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_role("admin")),
):
    category = session.get(Category, category_id)

    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    update_data = category_data.model_dump(exclude_unset=True)

    if "name" in update_data:
        existing_category = session.exec(
            select(Category).where(
                Category.name == update_data["name"],
                Category.id != category_id,
            )
        ).first()

        if existing_category:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Category already exists",
            )

    for field, value in update_data.items():
        setattr(category, field, value)

    session.add(category)
    session.commit()
    session.refresh(category)

    return category


@router.delete(
    "/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_category(
    category_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_role("admin")),
):
    category = session.get(Category, category_id)

    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    product_using_category = session.exec(
        select(Product).where(
            Product.category_id == category_id
        )
    ).first()

    if product_using_category:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete category because products use it",
        )

    session.delete(category)
    session.commit()