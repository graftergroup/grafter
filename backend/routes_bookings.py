"""Booking API routes."""

from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.dependencies import get_auth_user
from backend.models import User, Booking, BookingStatus, Job, JobStatus
from backend.schemas import BookingCreate, BookingUpdate, BookingResponse

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.post("", response_model=BookingResponse)
async def create_booking(
    booking_data: BookingCreate,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Create a new booking."""

    # Verify customer and service belong to the same franchise
    from backend.models import Customer, Service

    customer = (
        db.query(Customer)
        .filter(
            Customer.id == booking_data.customer_id,
            Customer.franchise_id == user.franchise_id,
        )
        .first()
    )

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )

    service = (
        db.query(Service)
        .filter(
            Service.id == booking_data.service_id,
            Service.franchise_id == user.franchise_id,
        )
        .first()
    )

    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found",
        )

    booking = Booking(
        franchise_id=user.franchise_id,
        customer_id=booking_data.customer_id,
        service_id=booking_data.service_id,
        scheduled_date=booking_data.scheduled_date,
        notes=booking_data.notes,
    )

    db.add(booking)
    db.commit()

    # Create a corresponding job
    job = Job(
        franchise_id=user.franchise_id,
        booking_id=booking.id,
        scheduled_date=booking_data.scheduled_date,
        status=JobStatus.PENDING,
    )

    db.add(job)
    db.commit()
    db.refresh(booking)

    return BookingResponse.from_orm(booking)


@router.get("", response_model=list[BookingResponse])
async def list_bookings(
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """List all bookings for the franchise."""

    bookings = (
        db.query(Booking)
        .filter(Booking.franchise_id == user.franchise_id)
        .all()
    )

    return [BookingResponse.from_orm(b) for b in bookings]


@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(
    booking_id: UUID,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Get a specific booking."""

    booking = (
        db.query(Booking)
        .filter(
            Booking.id == booking_id,
            Booking.franchise_id == user.franchise_id,
        )
        .first()
    )

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found",
        )

    return BookingResponse.from_orm(booking)


@router.put("/{booking_id}", response_model=BookingResponse)
async def update_booking(
    booking_id: UUID,
    booking_data: BookingUpdate,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Update a booking."""

    booking = (
        db.query(Booking)
        .filter(
            Booking.id == booking_id,
            Booking.franchise_id == user.franchise_id,
        )
        .first()
    )

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found",
        )

    # Update fields
    update_data = booking_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(booking, field, value)

    db.commit()
    db.refresh(booking)

    return BookingResponse.from_orm(booking)


@router.delete("/{booking_id}")
async def delete_booking(
    booking_id: UUID,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Delete a booking."""

    booking = (
        db.query(Booking)
        .filter(
            Booking.id == booking_id,
            Booking.franchise_id == user.franchise_id,
        )
        .first()
    )

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found",
        )

    db.delete(booking)
    db.commit()

    return {"status": "deleted"}
