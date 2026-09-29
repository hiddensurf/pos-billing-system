from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class LedgerEntryRead(BaseModel):
    id: int
    entry_type: str
    amount: Decimal
    direction: str
    reference_type: str
    reference_id: int | None
    description: str | None
    created_by: int
    created_at: datetime


class LedgerSummary(BaseModel):
    total_in: Decimal
    total_out: Decimal
    net_amount: Decimal
    entry_count: int