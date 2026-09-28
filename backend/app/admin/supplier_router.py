from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.auth.dependencies import require_role
from app.db import get_session
from app.models.models import Supplier

from app.admin.supplier_schemas import (
    SupplierCreate,
    SupplierRead,
    SupplierUpdate,
)


router = APIRouter(
    prefix="/admin/suppliers",
    tags=["Suppliers"],
)


@router.post(
    "",
    response_model=SupplierRead,
    status_code=status.HTTP_201_CREATED,
)
def create_supplier(
    supplier_data: SupplierCreate,
    session: Session = Depends(get_session),
    _: Supplier = Depends(require_role("admin")),
):
    existing_supplier = session.exec(
        select(Supplier).where(
            Supplier.name == supplier_data.name
        )
    ).first()

    if existing_supplier:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Supplier with this name already exists",
        )

    supplier = Supplier(
        **supplier_data.model_dump()
    )

    session.add(supplier)
    session.commit()
    session.refresh(supplier)

    return supplier


@router.get(
    "",
    response_model=list[SupplierRead],
)
def get_suppliers(
    session: Session = Depends(get_session),
    _: Supplier = Depends(require_role("admin")),
):
    statement = select(Supplier).order_by(Supplier.id)

    return session.exec(statement).all()


@router.get(
    "/{supplier_id}",
    response_model=SupplierRead,
)
def get_supplier(
    supplier_id: int,
    session: Session = Depends(get_session),
    _: Supplier = Depends(require_role("admin")),
):
    supplier = session.get(Supplier, supplier_id)

    if supplier is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )

    return supplier


@router.put(
    "/{supplier_id}",
    response_model=SupplierRead,
)
def update_supplier(
    supplier_id: int,
    supplier_data: SupplierUpdate,
    session: Session = Depends(get_session),
    _: Supplier = Depends(require_role("admin")),
):
    supplier = session.get(Supplier, supplier_id)

    if supplier is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )

    if supplier_data.name is not None:
        existing_supplier = session.exec(
            select(Supplier).where(
                Supplier.name == supplier_data.name,
                Supplier.id != supplier_id,
            )
        ).first()

        if existing_supplier:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Supplier with this name already exists",
            )

    update_data = supplier_data.model_dump(
        exclude_unset=True
    )

    for field, value in update_data.items():
        setattr(supplier, field, value)

    session.add(supplier)
    session.commit()
    session.refresh(supplier)

    return supplier


@router.delete(
    "/{supplier_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_supplier(
    supplier_id: int,
    session: Session = Depends(get_session),
    _: Supplier = Depends(require_role("admin")),
):
    supplier = session.get(Supplier, supplier_id)

    if supplier is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )

    supplier.is_active = False

    session.add(supplier)
    session.commit()

    return None