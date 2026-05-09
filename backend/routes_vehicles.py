"""Vehicle management API routes."""

from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.dependencies import get_auth_user
from backend.models import User, Vehicle
from backend.schemas import VehicleCreate, VehicleLocationUpdate, VehicleResponse

router = APIRouter(prefix="/vehicles", tags=["vehicles"])


@router.post("", response_model=VehicleResponse)
async def create_vehicle(
    vehicle_data: VehicleCreate,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Create a new vehicle."""

    # Check if plate number already exists in franchise
    existing = (
        db.query(Vehicle)
        .filter(
            Vehicle.franchise_id == user.franchise_id,
            Vehicle.plate_number == vehicle_data.plate_number,
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Vehicle with this plate number already exists",
        )

    vehicle = Vehicle(
        franchise_id=user.franchise_id,
        plate_number=vehicle_data.plate_number,
        make=vehicle_data.make,
        model=vehicle_data.model,
        year=vehicle_data.year,
        vin=vehicle_data.vin,
    )

    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)

    return VehicleResponse.from_orm(vehicle)


@router.get("", response_model=list[VehicleResponse])
async def list_vehicles(
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """List all vehicles for the franchise."""

    vehicles = (
        db.query(Vehicle)
        .filter(Vehicle.franchise_id == user.franchise_id)
        .all()
    )

    return [VehicleResponse.from_orm(v) for v in vehicles]


@router.get("/{vehicle_id}", response_model=VehicleResponse)
async def get_vehicle(
    vehicle_id: UUID,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Get a specific vehicle."""

    vehicle = (
        db.query(Vehicle)
        .filter(
            Vehicle.id == vehicle_id,
            Vehicle.franchise_id == user.franchise_id,
        )
        .first()
    )

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )

    return VehicleResponse.from_orm(vehicle)


@router.put("/{vehicle_id}", response_model=VehicleResponse)
async def update_vehicle(
    vehicle_id: UUID,
    vehicle_data: VehicleCreate,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Update a vehicle."""

    vehicle = (
        db.query(Vehicle)
        .filter(
            Vehicle.id == vehicle_id,
            Vehicle.franchise_id == user.franchise_id,
        )
        .first()
    )

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )

    # Update fields
    vehicle.plate_number = vehicle_data.plate_number
    vehicle.make = vehicle_data.make
    vehicle.model = vehicle_data.model
    vehicle.year = vehicle_data.year
    vehicle.vin = vehicle_data.vin

    db.commit()
    db.refresh(vehicle)

    return VehicleResponse.from_orm(vehicle)


@router.post("/{vehicle_id}/location", response_model=VehicleResponse)
async def update_vehicle_location(
    vehicle_id: UUID,
    location_data: VehicleLocationUpdate,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Update vehicle GPS location."""

    vehicle = (
        db.query(Vehicle)
        .filter(
            Vehicle.id == vehicle_id,
            Vehicle.franchise_id == user.franchise_id,
        )
        .first()
    )

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )

    vehicle.current_latitude = location_data.latitude
    vehicle.current_longitude = location_data.longitude
    vehicle.last_location_update = datetime.utcnow()

    db.commit()
    db.refresh(vehicle)

    return VehicleResponse.from_orm(vehicle)


@router.delete("/{vehicle_id}")
async def delete_vehicle(
    vehicle_id: UUID,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Delete a vehicle."""

    vehicle = (
        db.query(Vehicle)
        .filter(
            Vehicle.id == vehicle_id,
            Vehicle.franchise_id == user.franchise_id,
        )
        .first()
    )

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )

    db.delete(vehicle)
    db.commit()

    return {"status": "deleted"}
