from datetime import date, datetime, time, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select

from app.auth.dependencies import require_role
from app.db import get_session
from app.models.models import LedgerEntry, User

from app.admin.ledger_schemas import (
    LedgerEntryRead,
    LedgerSummary,
)


router = APIRouter(
    prefix="/admin/ledger",
    tags=["Admin - Ledger"],
)


@router.get(
    "",
    response_model=list[LedgerEntryRead],
)
def list_ledger_entries(
    entry_type: str | None = Query(default=None),
    direction: str | None = Query(default=None),
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    session: Session = Depends(get_session),
    current_user: User = Depends(require_role("admin")),
):
    statement = select(LedgerEntry)

    if entry_type:
        statement = statement.where(
            LedgerEntry.entry_type == entry_type
        )

    if direction:
        statement = statement.where(
            LedgerEntry.direction == direction
        )

    if from_date:
        start_datetime = datetime.combine(
            from_date,
            time.min,
            tzinfo=timezone.utc,
        )
        statement = statement.where(
            LedgerEntry.created_at >= start_datetime
        )

    if to_date:
        end_datetime = datetime.combine(
            to_date,
            time.max,
            tzinfo=timezone.utc,
        )
        statement = statement.where(
            LedgerEntry.created_at <= end_datetime
        )

    statement = statement.order_by(
        LedgerEntry.created_at.desc(),
        LedgerEntry.id.desc(),
    )

    return session.exec(statement).all()


@router.get(
    "/summary",
    response_model=LedgerSummary,
)
def ledger_summary(
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    session: Session = Depends(get_session),
    current_user: User = Depends(require_role("admin")),
):
    statement = select(LedgerEntry)

    if from_date:
        start_datetime = datetime.combine(
            from_date,
            time.min,
            tzinfo=timezone.utc,
        )
        statement = statement.where(
            LedgerEntry.created_at >= start_datetime
        )

    if to_date:
        end_datetime = datetime.combine(
            to_date,
            time.max,
            tzinfo=timezone.utc,
        )
        statement = statement.where(
            LedgerEntry.created_at <= end_datetime
        )

    entries = session.exec(statement).all()

    total_in = sum(
        (entry.amount for entry in entries if entry.direction == "IN"),
        Decimal("0.00"),
    )

    total_out = sum(
        (entry.amount for entry in entries if entry.direction == "OUT"),
        Decimal("0.00"),
    )

    return LedgerSummary(
        total_in=total_in,
        total_out=total_out,
        net_amount=total_in - total_out,
        entry_count=len(entries),
    )


@router.get(
    "/{entry_id}",
    response_model=LedgerEntryRead,
)
def get_ledger_entry(
    entry_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_role("admin")),
):
    entry = session.get(LedgerEntry, entry_id)

    if entry is None:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ledger entry not found",
        )

    return entry