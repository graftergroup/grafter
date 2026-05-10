"""Superadmin management API routes."""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.dependencies import get_superadmin_user
from backend.models import User, Franchise, UserRole, Booking, Invoice, Payment, Job, FranchiseBillingRecord
from backend.schemas import (
    FranchiseCreateRequest,
    FranchiseUpdateRequest,
    FranchiseDetailResponse,
    BillingRecordResponse,
    GenerateBillingRequest,
    UpdateBillingStatusRequest,
    UpdateCommissionRequest,
)

router = APIRouter(prefix="/superadmin", tags=["superadmin"])


@router.get("/franchises", response_model=list[FranchiseDetailResponse])
async def list_franchises(
    user: User = Depends(get_superadmin_user),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
):
    """List all franchises (superadmin only)."""

    franchises = db.query(Franchise).offset(skip).limit(limit).all()
    return [FranchiseDetailResponse.from_orm(f) for f in franchises]


@router.post("/franchises", response_model=FranchiseDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_franchise(
    franchise_data: FranchiseCreateRequest,
    user: User = Depends(get_superadmin_user),
    db: Session = Depends(get_db),
):
    """Create a new franchise (superadmin only)."""

    # Check if franchise name already exists
    existing = db.query(Franchise).filter(Franchise.name == franchise_data.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Franchise with this name already exists",
        )

    # Create slug from name
    slug = franchise_data.name.lower().replace(" ", "-").replace("'", "")

    new_franchise = Franchise(
        name=franchise_data.name,
        slug=slug,
        email=franchise_data.email,
        phone=franchise_data.phone,
        address=franchise_data.address,
        city=franchise_data.city,
        state=franchise_data.state,
        postal_code=franchise_data.postal_code,
        country=franchise_data.country,
        notes=franchise_data.notes,
        approval_status="approved",
        subscription_status="active",
        approved_at=datetime.utcnow(),
    )

    db.add(new_franchise)
    db.commit()
    db.refresh(new_franchise)

    return FranchiseDetailResponse.from_orm(new_franchise)


@router.get("/franchises/{franchise_id}", response_model=FranchiseDetailResponse)
async def get_franchise(
    franchise_id: str,
    user: User = Depends(get_superadmin_user),
    db: Session = Depends(get_db),
):
    """Get a specific franchise (superadmin only)."""

    franchise = db.query(Franchise).filter(Franchise.id == franchise_id).first()

    if not franchise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Franchise not found",
        )

    return FranchiseDetailResponse.from_orm(franchise)


@router.put("/franchises/{franchise_id}", response_model=FranchiseDetailResponse)
async def update_franchise(
    franchise_id: str,
    franchise_data: FranchiseUpdateRequest,
    user: User = Depends(get_superadmin_user),
    db: Session = Depends(get_db),
):
    """Update a franchise (superadmin only)."""

    franchise = db.query(Franchise).filter(Franchise.id == franchise_id).first()

    if not franchise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Franchise not found",
        )

    # Check for duplicate name
    if franchise_data.name and franchise_data.name != franchise.name:
        existing = db.query(Franchise).filter(Franchise.name == franchise_data.name).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Franchise name already in use",
            )
        franchise.name = franchise_data.name

    # Update fields
    if franchise_data.email is not None:
        franchise.email = franchise_data.email
    if franchise_data.phone is not None:
        franchise.phone = franchise_data.phone
    if franchise_data.address is not None:
        franchise.address = franchise_data.address
    if franchise_data.city is not None:
        franchise.city = franchise_data.city
    if franchise_data.state is not None:
        franchise.state = franchise_data.state
    if franchise_data.postal_code is not None:
        franchise.postal_code = franchise_data.postal_code
    if franchise_data.country is not None:
        franchise.country = franchise_data.country
    if franchise_data.is_active is not None:
        franchise.is_active = franchise_data.is_active
    if franchise_data.approval_status is not None:
        franchise.approval_status = franchise_data.approval_status
        if franchise_data.approval_status == "approved" and not franchise.approved_at:
            franchise.approved_at = datetime.utcnow()
    if franchise_data.subscription_status is not None:
        franchise.subscription_status = franchise_data.subscription_status
    if franchise_data.notes is not None:
        franchise.notes = franchise_data.notes

    db.commit()
    db.refresh(franchise)

    return FranchiseDetailResponse.from_orm(franchise)


@router.delete("/franchises/{franchise_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_franchise(
    franchise_id: str,
    user: User = Depends(get_superadmin_user),
    db: Session = Depends(get_db),
):
    """Toggle franchise active/inactive (soft delete)."""

    franchise = db.query(Franchise).filter(Franchise.id == franchise_id).first()

    if not franchise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Franchise not found",
        )

    # Soft delete
    franchise.is_active = not franchise.is_active
    db.commit()


@router.get("/franchises/{franchise_id}/stats")
async def get_franchise_stats(
    franchise_id: str,
    user: User = Depends(get_superadmin_user),
    db: Session = Depends(get_db),
):
    """Get franchise metrics (superadmin only)."""

    franchise = db.query(Franchise).filter(Franchise.id == franchise_id).first()

    if not franchise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Franchise not found",
        )

    # Get metrics
    staff_count = db.query(func.count(User.id)).filter(
        User.franchise_id == franchise_id,
        User.role.in_([UserRole.TECHNICIAN, UserRole.OFFICE_STAFF]),
    ).scalar() or 0

    total_bookings = db.query(func.count(Booking.id)).filter(
        Booking.franchise_id == franchise_id
    ).scalar() or 0

    total_revenue = db.query(func.sum(Invoice.total_amount)).filter(
        Invoice.franchise_id == franchise_id
    ).scalar() or 0

    completed_jobs = db.query(func.count(Job.id)).filter(
        Job.franchise_id == franchise_id,
        Job.status == "completed",
    ).scalar() or 0

    return {
        "franchise_id": franchise_id,
        "staff_count": staff_count,
        "total_bookings": total_bookings,
        "total_revenue": float(total_revenue),
        "completed_jobs": completed_jobs,
    }


@router.get("/analytics")
async def get_platform_analytics(
    user: User = Depends(get_superadmin_user),
    db: Session = Depends(get_db),
):
    """Get platform-wide analytics (superadmin only)."""

    # Get metrics across all franchises
    total_franchises = db.query(func.count(Franchise.id)).scalar() or 0
    active_franchises = db.query(func.count(Franchise.id)).filter(
        Franchise.is_active == True
    ).scalar() or 0

    total_staff = db.query(func.count(User.id)).filter(
        User.role.in_([UserRole.TECHNICIAN, UserRole.OFFICE_STAFF])
    ).scalar() or 0

    total_bookings = db.query(func.count(Booking.id)).scalar() or 0

    total_revenue = db.query(func.sum(Invoice.total_amount)).scalar() or 0

    total_jobs = db.query(func.count(Job.id)).scalar() or 0

    # Get franchise breakdown
    franchise_stats = db.query(
        Franchise.id,
        Franchise.name,
        func.count(User.id).label("staff_count"),
        func.sum(Invoice.total_amount).label("revenue"),
    ).outerjoin(User).outerjoin(Invoice).group_by(Franchise.id).all()

    franchises_breakdown = [
        {
            "franchise_id": str(stat[0]),
            "franchise_name": stat[1],
            "staff_count": stat[2] or 0,
            "revenue": float(stat[3] or 0),
        }
        for stat in franchise_stats
    ]

    return {
        "total_franchises": total_franchises,
        "active_franchises": active_franchises,
        "total_staff": total_staff,
        "total_bookings": total_bookings,
        "total_revenue": float(total_revenue),
        "total_jobs": total_jobs,
        "franchises_breakdown": franchises_breakdown,
    }


# ==================== Billing / Commission ====================


@router.get("/billing", response_model=list[BillingRecordResponse])
async def list_billing_records(
    user: User = Depends(get_superadmin_user),
    db: Session = Depends(get_db),
    franchise_id: str = None,
    status: str = None,
):
    """List all billing records. Optionally filter by franchise or status."""
    query = db.query(FranchiseBillingRecord)
    if franchise_id:
        query = query.filter(FranchiseBillingRecord.franchise_id == franchise_id)
    if status:
        query = query.filter(FranchiseBillingRecord.status == status)
    records = query.order_by(FranchiseBillingRecord.period_start.desc()).all()

    result = []
    for rec in records:
        franchise = db.query(Franchise).filter(Franchise.id == rec.franchise_id).first()
        r = BillingRecordResponse.from_orm(rec)
        r.franchise_name = franchise.name if franchise else None
        result.append(r)
    return result


@router.post("/billing/generate", response_model=list[BillingRecordResponse], status_code=status.HTTP_201_CREATED)
async def generate_billing_records(
    body: GenerateBillingRequest,
    user: User = Depends(get_superadmin_user),
    db: Session = Depends(get_db),
):
    """
    Generate billing records for a date range.
    Calculates gross revenue (sum of invoices) and applies each franchise's commission rate.
    """
    if body.franchise_id:
        franchises = db.query(Franchise).filter(Franchise.id == body.franchise_id).all()
    else:
        franchises = db.query(Franchise).filter(Franchise.is_active == True).all()

    created = []
    for franchise in franchises:
        # Check for duplicate period
        existing = db.query(FranchiseBillingRecord).filter(
            FranchiseBillingRecord.franchise_id == franchise.id,
            FranchiseBillingRecord.period_start == body.period_start,
            FranchiseBillingRecord.period_end == body.period_end,
        ).first()
        if existing:
            continue

        gross = db.query(func.sum(Invoice.total)).filter(
            Invoice.franchise_id == franchise.id,
            Invoice.issued_date >= body.period_start,
            Invoice.issued_date < body.period_end,
        ).scalar() or 0.0

        rate = franchise.commission_rate or 0.10
        commission = round(float(gross) * rate, 2)

        rec = FranchiseBillingRecord(
            franchise_id=franchise.id,
            period_start=body.period_start,
            period_end=body.period_end,
            gross_revenue=float(gross),
            commission_rate=rate,
            commission_amount=commission,
            status="pending",
        )
        db.add(rec)
        db.flush()
        db.refresh(rec)
        r = BillingRecordResponse.from_orm(rec)
        r.franchise_name = franchise.name
        created.append(r)

    db.commit()
    return created


@router.put("/billing/{record_id}", response_model=BillingRecordResponse)
async def update_billing_status(
    record_id: str,
    body: UpdateBillingStatusRequest,
    user: User = Depends(get_superadmin_user),
    db: Session = Depends(get_db),
):
    """Update billing record status (pending → invoiced → paid)."""
    rec = db.query(FranchiseBillingRecord).filter(FranchiseBillingRecord.id == record_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Billing record not found")
    rec.status = body.status
    if body.notes:
        rec.notes = body.notes
    db.commit()
    db.refresh(rec)
    franchise = db.query(Franchise).filter(Franchise.id == rec.franchise_id).first()
    r = BillingRecordResponse.from_orm(rec)
    r.franchise_name = franchise.name if franchise else None
    return r


@router.put("/franchises/{franchise_id}/commission", response_model=FranchiseDetailResponse)
async def update_franchise_commission(
    franchise_id: str,
    body: UpdateCommissionRequest,
    user: User = Depends(get_superadmin_user),
    db: Session = Depends(get_db),
):
    """Update a franchise's commission rate and billing email."""
    franchise = db.query(Franchise).filter(Franchise.id == franchise_id).first()
    if not franchise:
        raise HTTPException(status_code=404, detail="Franchise not found")
    franchise.commission_rate = body.commission_rate
    if body.billing_email is not None:
        franchise.billing_email = body.billing_email
    db.commit()
    db.refresh(franchise)
    return FranchiseDetailResponse.from_orm(franchise)
