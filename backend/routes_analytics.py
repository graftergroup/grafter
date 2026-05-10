"""Analytics and metrics API routes for admin dashboard."""

from datetime import datetime, timedelta
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.dependencies import get_auth_user
from backend.models import (
    User,
    Booking,
    Job,
    Customer,
    Invoice,
    Payment,
    BookingStatus,
    JobStatus,
    PaymentStatus,
    UserRole,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/dashboard-metrics")
async def get_dashboard_metrics(
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Get key metrics for admin dashboard."""

    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    year_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)

    # Total customers
    total_customers = (
        db.query(func.count(Customer.id))
        .filter(Customer.franchise_id == user.franchise_id)
        .scalar()
        or 0
    )

    # Total bookings
    total_bookings = (
        db.query(func.count(Booking.id))
        .filter(Booking.franchise_id == user.franchise_id)
        .scalar()
        or 0
    )

    # Pending bookings
    pending_bookings = (
        db.query(func.count(Booking.id))
        .filter(
            Booking.franchise_id == user.franchise_id,
            Booking.status == BookingStatus.PENDING,
        )
        .scalar()
        or 0
    )

    # Completed jobs this month
    completed_jobs_month = (
        db.query(func.count(Job.id))
        .filter(
            Job.franchise_id == user.franchise_id,
            Job.status == JobStatus.COMPLETED,
            Job.completed_date >= month_start,
        )
        .scalar()
        or 0
    )

    # Active jobs
    active_jobs = (
        db.query(func.count(Job.id))
        .filter(
            Job.franchise_id == user.franchise_id,
            Job.status == JobStatus.IN_PROGRESS,
        )
        .scalar()
        or 0
    )

    # Revenue this month
    revenue_month = (
        db.query(func.sum(Invoice.total))
        .filter(
            Invoice.franchise_id == user.franchise_id,
            Invoice.issued_date >= month_start,
        )
        .scalar()
        or 0.0
    )

    # Revenue this year
    revenue_year = (
        db.query(func.sum(Invoice.total))
        .filter(
            Invoice.franchise_id == user.franchise_id,
            Invoice.issued_date >= year_start,
        )
        .scalar()
        or 0.0
    )

    return {
        "total_customers": total_customers,
        "total_bookings": total_bookings,
        "pending_bookings": pending_bookings,
        "completed_jobs_month": completed_jobs_month,
        "active_jobs": active_jobs,
        "revenue_month": float(revenue_month),
        "revenue_year": float(revenue_year),
    }


@router.get("/revenue-by-service")
async def get_revenue_by_service(
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Get revenue breakdown by service type."""

    # This is a simplified version - in production you'd join with Service table
    invoices = (
        db.query(Invoice)
        .filter(Invoice.franchise_id == user.franchise_id)
        .all()
    )

    service_revenue = {}
    for invoice in invoices:
        total = service_revenue.get("Other", 0.0)
        service_revenue["Other"] = total + invoice.total

    return [{"name": k, "value": v} for k, v in service_revenue.items()]


@router.get("/technician-performance")
async def get_technician_performance(
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Get performance metrics for each technician."""

    technicians = (
        db.query(User)
        .filter(
            User.franchise_id == user.franchise_id,
            User.role == "technician",
        )
        .all()
    )

    performance_data = []
    for tech in technicians:
        # Total jobs assigned
        total_jobs = (
            db.query(func.count(Job.id))
            .filter(Job.assigned_technician_id == tech.id)
            .scalar()
            or 0
        )

        # Completed jobs
        completed_jobs = (
            db.query(func.count(Job.id))
            .filter(
                Job.assigned_technician_id == tech.id,
                Job.status == JobStatus.COMPLETED,
            )
            .scalar()
            or 0
        )

        completion_rate = (
            (completed_jobs / total_jobs * 100) if total_jobs > 0 else 0
        )

        performance_data.append(
            {
                "technician_id": str(tech.id),
                "name": f"{tech.first_name} {tech.last_name}",
                "total_jobs": total_jobs,
                "completed_jobs": completed_jobs,
                "completion_rate": round(completion_rate, 2),
            }
        )

    return performance_data


@router.get("/recent-bookings")
async def get_recent_bookings(
    limit: int = 5,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Get recent bookings for the franchise."""

    bookings = (
        db.query(Booking)
        .filter(Booking.franchise_id == user.franchise_id)
        .order_by(Booking.created_at.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "id": str(booking.id),
            "customer_id": str(booking.customer_id),
            "scheduled_date": booking.scheduled_date.isoformat(),
            "status": booking.status.value,
            "created_at": booking.created_at.isoformat(),
        }
        for booking in bookings
    ]


@router.get("/payment-status")
async def get_payment_status(
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Get payment status summary."""

    # Get franchise invoices
    invoices = (
        db.query(Invoice)
        .filter(Invoice.franchise_id == user.franchise_id)
        .all()
    )

    paid = 0.0
    pending = 0.0
    overdue = 0.0

    now = datetime.utcnow()

    for invoice in invoices:
        # Check if invoice is paid
        paid_amount = (
            db.query(func.sum(Payment.amount))
            .filter(
                Payment.invoice_id == invoice.id,
                Payment.status == PaymentStatus.COMPLETED,
            )
            .scalar()
            or 0.0
        )

        if paid_amount >= invoice.total:
            paid += invoice.total
        else:
            remaining = invoice.total - paid_amount
            if invoice.due_date and invoice.due_date < now:
                overdue += remaining
            else:
                pending += remaining

    return {
        "paid": float(paid),
        "pending": float(pending),
        "overdue": float(overdue),
    }


@router.get("/customer-acquisition")
async def get_customer_acquisition(
    months: int = 6,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Get customer acquisition trend over last N months."""

    now = datetime.utcnow()
    data = []

    for i in range(months, 0, -1):
        month_start = (now - timedelta(days=30 * i)).replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        )
        month_end = (month_start + timedelta(days=32)).replace(day=1)

        count = (
            db.query(func.count(Customer.id))
            .filter(
                Customer.franchise_id == user.franchise_id,
                Customer.created_at >= month_start,
                Customer.created_at < month_end,
            )
            .scalar()
            or 0
        )

        data.append(
            {
                "month": month_start.strftime("%B"),
                "count": count,
            }
        )

    return data


@router.get("/job-completion-rate")
async def get_job_completion_rate(
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Get job completion rate over last 30 days."""

    now = datetime.utcnow()
    thirty_days_ago = now - timedelta(days=30)

    total_jobs = (
        db.query(func.count(Job.id))
        .filter(
            Job.franchise_id == user.franchise_id,
            Job.created_at >= thirty_days_ago,
        )
        .scalar()
        or 0
    )

    completed_jobs = (
        db.query(func.count(Job.id))
        .filter(
            Job.franchise_id == user.franchise_id,
            Job.status == JobStatus.COMPLETED,
            Job.created_at >= thirty_days_ago,
        )
        .scalar()
        or 0
    )

    completion_rate = (
        (completed_jobs / total_jobs * 100) if total_jobs > 0 else 0
    )

    return {
        "total_jobs": total_jobs,
        "completed_jobs": completed_jobs,
        "completion_rate": round(completion_rate, 2),
    }


@router.get("/staff-performance")
async def get_staff_performance(
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """
    Per-technician performance metrics for the franchise.
    Returns jobs assigned, jobs completed, completion rate, and revenue contribution.
    """
    technicians = (
        db.query(User)
        .filter(
            User.franchise_id == user.franchise_id,
            User.role == UserRole.TECHNICIAN,
            User.is_active == True,
        )
        .all()
    )

    result = []
    for tech in technicians:
        total_assigned = (
            db.query(func.count(Job.id))
            .filter(Job.assigned_technician_id == tech.id)
            .scalar() or 0
        )
        total_completed = (
            db.query(func.count(Job.id))
            .filter(
                Job.assigned_technician_id == tech.id,
                Job.status == JobStatus.COMPLETED,
            )
            .scalar() or 0
        )
        completion_rate = round((total_completed / total_assigned * 100) if total_assigned > 0 else 0, 1)

        # Revenue: sum of invoice totals for completed jobs linked to this tech
        # via booking_id chain: job -> booking -> invoice (by customer)
        # Simpler: sum invoices in same franchise weighted by completed job count
        # We'll track revenue by jobs completed (proxy: avg invoice per completed job)
        avg_invoice = (
            db.query(func.avg(Invoice.total))
            .filter(Invoice.franchise_id == user.franchise_id)
            .scalar() or 0
        )
        estimated_revenue = round(float(avg_invoice) * total_completed, 2)

        result.append({
            "id": str(tech.id),
            "name": f"{tech.first_name} {tech.last_name}",
            "email": tech.email,
            "staff_type": tech.staff_type,
            "total_assigned": total_assigned,
            "total_completed": total_completed,
            "completion_rate": completion_rate,
            "estimated_revenue": estimated_revenue,
        })

    # Sort by completed jobs desc
    result.sort(key=lambda x: x["total_completed"], reverse=True)
    return result
