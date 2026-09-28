from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.admin.staff_schemas import (
    StaffCreate,
    StaffPasswordReset,
    StaffRead,
    StaffUpdate,
)
from app.auth.dependencies import require_role
from app.auth.security import hash_password
from app.db import get_session
from app.models.models import User


router = APIRouter(
    prefix="/admin/staff",
    tags=["Staff"],
)


@router.post(
    "",
    response_model=StaffRead,
    status_code=status.HTTP_201_CREATED,
)
def create_staff(
    staff_data: StaffCreate,
    session: Session = Depends(get_session),
    _: User = Depends(require_role("admin")),
):
    existing_user = session.exec(
        select(User).where(
            User.username == staff_data.username
        )
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already exists",
        )

    staff = User(
        username=staff_data.username,
        password_hash=hash_password(staff_data.password),
        full_name=staff_data.full_name,
        role="staff",
        is_active=True,
    )

    session.add(staff)
    session.commit()
    session.refresh(staff)

    return staff


@router.get(
    "",
    response_model=list[StaffRead],
)
def get_staff(
    session: Session = Depends(get_session),
    _: User = Depends(require_role("admin")),
):
    statement = select(User).where(
        User.role == "staff"
    ).order_by(User.id)

    return session.exec(statement).all()


@router.get(
    "/{staff_id}",
    response_model=StaffRead,
)
def get_staff_member(
    staff_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(require_role("admin")),
):
    staff = session.get(User, staff_id)

    if staff is None or staff.role != "staff":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found",
        )

    return staff


@router.put(
    "/{staff_id}",
    response_model=StaffRead,
)
def update_staff(
    staff_id: int,
    staff_data: StaffUpdate,
    session: Session = Depends(get_session),
    _: User = Depends(require_role("admin")),
):
    staff = session.get(User, staff_id)

    if staff is None or staff.role != "staff":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found",
        )

    if staff_data.username is not None:
        existing_user = session.exec(
            select(User).where(
                User.username == staff_data.username,
                User.id != staff_id,
            )
        ).first()

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username already exists",
            )

    update_data = staff_data.model_dump(
        exclude_unset=True
    )

    for field, value in update_data.items():
        setattr(staff, field, value)

    session.add(staff)
    session.commit()
    session.refresh(staff)

    return staff


@router.patch(
    "/{staff_id}/status",
    response_model=StaffRead,
)
def update_staff_status(
    staff_id: int,
    is_active: bool,
    session: Session = Depends(get_session),
    _: User = Depends(require_role("admin")),
):
    staff = session.get(User, staff_id)

    if staff is None or staff.role != "staff":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found",
        )

    staff.is_active = is_active

    session.add(staff)
    session.commit()
    session.refresh(staff)

    return staff


@router.patch(
    "/{staff_id}/password",
    response_model=StaffRead,
)
def reset_staff_password(
    staff_id: int,
    password_data: StaffPasswordReset,
    session: Session = Depends(get_session),
    _: User = Depends(require_role("admin")),
):
    staff = session.get(User, staff_id)

    if staff is None or staff.role != "staff":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found",
        )

    staff.password_hash = hash_password(
        password_data.new_password
    )

    session.add(staff)
    session.commit()
    session.refresh(staff)

    return staff