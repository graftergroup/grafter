"""Superadmin management API routes."""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.dependencies import get_superadmin_user
from backend.models import User, Franchise, UserRole, Booking, Invoice, Payment, Job
from backend.schemas import (
    FranchiseCreateRequest,
    FranchiseUpdateRequest,
    FranchiseDetailResponse,
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
