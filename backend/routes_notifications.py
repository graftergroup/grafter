"""Unified notifications endpoint — aggregates all alert types across the platform.

Adding a new alert source:
  1. Write a function  _collect_<source>(db, franchise_id, now) -> list[Notification]
  2. Append it to the COLLECTORS list at the bottom of this file.
  That's it — the endpoint picks it up automatically.
"""

from datetime import datetime, timedelta
from typing import Optional
from dataclasses import dataclass, asdict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.dependencies import get_auth_user
from backend.models import (
    User,
    EmployeeDocument,
    LeaveRequest,
    ExpenseClaim,
    Invoice,
    Booking, BookingStatus,
    JobPosting,
    FranchiseModule,
)

notifications_router = APIRouter(prefix="/notifications", tags=["notifications"])


# ─── Shared data shape ────────────────────────────────────────────────────────

@dataclass
class Notification:
    id: str                  # unique stable key (source:id)
    type: str                # "document_expiry" | "leave_request" | etc.
    category: str            # top-level grouping label shown in the bell
    severity: str            # "critical" | "warning" | "info"
    title: str               # short one-liner
    subtitle: str            # secondary detail (employee name, amount, etc.)
    action_label: str        # link label
    action_url: str          # frontend path to navigate to
    timestamp: Optional[str] = None  # ISO string for sorting


# ─── Collectors ───────────────────────────────────────────────────────────────

def _collect_document_expiry(db: Session, franchise_id, now: datetime) -> list[Notification]:
    """Documents expiring within 90 days or already expired."""
    cutoff = now + timedelta(days=90)
    docs = (
        db.query(EmployeeDocument)
        .filter(
            EmployeeDocument.franchise_id == franchise_id,
            EmployeeDocument.expiry_date.isnot(None),
            EmployeeDocument.expiry_date <= cutoff,
        )
        .order_by(EmployeeDocument.expiry_date.asc())
        .all()
    )
    result = []
    for d in docs:
        delta = (d.expiry_date.date() - now.date()).days
        if delta < 0:
            severity = "critical"
            detail = f"Expired {abs(delta)}d ago"
        elif delta <= 30:
            severity = "critical"
            detail = f"{delta}d left"
        else:
            severity = "warning"
            detail = f"{delta}d left"

        emp_name = ""
        if d.employee:
            emp_name = f"{d.employee.first_name} {d.employee.last_name}"

        result.append(Notification(
            id=f"doc_expiry:{d.id}",
            type="document_expiry",
            category="Documents",
            severity=severity,
            title=d.title,
            subtitle=f"{emp_name} · {detail}",
            action_label="View employee",
            action_url=f"/admin/hr/employees/{d.employee_id}",
            timestamp=d.expiry_date.isoformat(),
        ))
    return result


def _collect_leave_requests(db: Session, franchise_id, now: datetime) -> list[Notification]:
    """Pending leave requests awaiting approval."""
    rows = (
        db.query(LeaveRequest)
        .filter(
            LeaveRequest.franchise_id == franchise_id,
            LeaveRequest.status == "pending",
        )
        .order_by(LeaveRequest.created_at.asc())
        .all()
    )
    result = []
    for r in rows:
        emp_name = ""
        if r.employee:
            emp_name = f"{r.employee.first_name} {r.employee.last_name}"
        days_label = f"{r.days}d" if r.days else ""
        start = r.start_date.strftime("%d %b") if r.start_date else ""
        result.append(Notification(
            id=f"leave:{r.id}",
            type="leave_request",
            category="Leave",
            severity="info",
            title=f"{r.leave_type.capitalize()} leave request",
            subtitle=f"{emp_name} · {start} ({days_label})",
            action_label="Review",
            action_url=f"/admin/hr/employees/{r.employee_id}",
            timestamp=r.created_at.isoformat() if r.created_at else None,
        ))
    return result


def _collect_expense_claims(db: Session, franchise_id, now: datetime) -> list[Notification]:
    """Pending expense claims awaiting approval."""
    rows = (
        db.query(ExpenseClaim)
        .filter(
            ExpenseClaim.franchise_id == franchise_id,
            ExpenseClaim.status == "pending",
        )
        .order_by(ExpenseClaim.created_at.asc())
        .all()
    )
    result = []
    for e in rows:
        emp_name = ""
        if hasattr(e, "employee") and e.employee:
            emp_name = f"{e.employee.first_name} {e.employee.last_name}"
        result.append(Notification(
            id=f"expense:{e.id}",
            type="expense_claim",
            category="Expenses",
            severity="info",
            title=e.description or "Expense claim",
            subtitle=f"{emp_name} · £{e.amount:.2f}",
            action_label="Review",
            action_url=f"/admin/hr/employees/{e.employee_id}",
            timestamp=e.created_at.isoformat() if e.created_at else None,
        ))
    return result


def _collect_unpaid_invoices(db: Session, franchise_id, now: datetime) -> list[Notification]:
    """Overdue invoices — due date passed but no completed payment."""
    try:
        from sqlalchemy import not_, exists
        from backend.models import Payment, PaymentStatus

        # Find invoices past due with no successful payment
        overdue = (
            db.query(Invoice)
            .filter(
                Invoice.franchise_id == franchise_id,
                Invoice.due_date.isnot(None),
                Invoice.due_date < now,
            )
            .outerjoin(Invoice.payments)
            .filter(
                ~exists().where(
                    (Payment.invoice_id == Invoice.id) &
                    (Payment.status == PaymentStatus.COMPLETED)
                )
            )
            .order_by(Invoice.due_date.asc())
            .limit(20)
            .all()
        )
        result = []
        for inv in overdue:
            days_overdue = (now.date() - inv.due_date.date()).days
            customer_name = ""
            if hasattr(inv, "customer") and inv.customer:
                customer_name = f"{inv.customer.first_name} {inv.customer.last_name}"
            result.append(Notification(
                id=f"invoice:{inv.id}",
                type="overdue_invoice",
                category="Revenue",
                severity="warning" if days_overdue < 14 else "critical",
                title=f"Invoice #{inv.invoice_number} overdue",
                subtitle=f"{customer_name} · {days_overdue}d overdue · £{inv.total:.2f}",
                action_label="View invoice",
                action_url="/admin/invoices",
                timestamp=inv.due_date.isoformat() if inv.due_date else None,
            ))
        return result
    except Exception:
        return []


def _collect_pending_bookings(db: Session, franchise_id, now: datetime) -> list[Notification]:
    """New bookings awaiting confirmation."""
    rows = (
        db.query(Booking)
        .filter(
            Booking.franchise_id == franchise_id,
            Booking.status == BookingStatus.PENDING,
        )
        .order_by(Booking.created_at.asc())
        .limit(20)
        .all()
    )
    result = []
    for b in rows:
        customer_name = ""
        if hasattr(b, "customer") and b.customer:
            customer_name = f"{b.customer.first_name} {b.customer.last_name}"
        result.append(Notification(
            id=f"booking:{b.id}",
            type="pending_booking",
            category="Bookings",
            severity="info",
            title="New booking awaiting confirmation",
            subtitle=customer_name or f"Booking {str(b.id)[:8]}",
            action_label="View bookings",
            action_url="/admin/bookings",
            timestamp=b.created_at.isoformat() if b.created_at else None,
        ))
    return result


def _collect_module_requests(db: Session, franchise_id, now: datetime) -> list[Notification]:
    """Module activation requests pending superadmin approval."""
    try:
        rows = (
            db.query(FranchiseModule)
            .filter(
                FranchiseModule.franchise_id == franchise_id,
                FranchiseModule.status == "pending",
            )
            .all()
        )
        result = []
        for m in rows:
            module_name = m.module.name if (hasattr(m, "module") and m.module) else str(m.module_id)[:8]
            result.append(Notification(
                id=f"module:{m.id}",
                type="module_request",
                category="Modules",
                severity="info",
                title="Module request pending approval",
                subtitle=module_name,
                action_label="View settings",
                action_url="/admin/settings?tab=modules",
                timestamp=m.requested_at.isoformat() if m.requested_at else None,
            ))
        return result
    except Exception:
        return []


# ─── Collector registry ───────────────────────────────────────────────────────
# Add new collectors here — order controls display priority.
COLLECTORS = [
    _collect_document_expiry,
    _collect_leave_requests,
    _collect_expense_claims,
    _collect_unpaid_invoices,
    _collect_pending_bookings,
    _collect_module_requests,
]

SEVERITY_ORDER = {"critical": 0, "warning": 1, "info": 2}


# ─── Endpoint ─────────────────────────────────────────────────────────────────

@notifications_router.get("")
async def get_notifications(
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """
    Returns all current alerts for this franchise, sorted by severity then timestamp.
    Each item has: id, type, category, severity, title, subtitle, action_label, action_url.
    """
    if not user.franchise_id:
        return []

    now = datetime.utcnow()
    all_notifications: list[Notification] = []

    for collector in COLLECTORS:
        try:
            all_notifications.extend(collector(db, user.franchise_id, now))
        except Exception as e:
            # Never let a single broken collector kill the whole endpoint
            print(f"[notifications] collector {collector.__name__} failed: {e}")

    # Sort: critical first, then warning, then info; within same severity by timestamp asc
    all_notifications.sort(key=lambda n: (
        SEVERITY_ORDER.get(n.severity, 99),
        n.timestamp or "9999",
    ))

    return [asdict(n) for n in all_notifications]


@notifications_router.get("/summary")
async def get_notification_summary(
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Lightweight count-only endpoint for the bell badge (no full data)."""
    if not user.franchise_id:
        return {"total": 0, "critical": 0, "warning": 0, "info": 0, "by_category": {}}

    now = datetime.utcnow()
    counts = {"critical": 0, "warning": 0, "info": 0}
    by_category: dict[str, int] = {}

    for collector in COLLECTORS:
        try:
            items = collector(db, user.franchise_id, now)
            for n in items:
                counts[n.severity] = counts.get(n.severity, 0) + 1
                by_category[n.category] = by_category.get(n.category, 0) + 1
        except Exception as e:
            print(f"[notifications] summary collector {collector.__name__} failed: {e}")

    return {
        "total": sum(counts.values()),
        **counts,
        "by_category": by_category,
    }
