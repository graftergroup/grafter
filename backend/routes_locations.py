"""Franchise location (branch) management routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime

from backend.db import get_db
from backend.dependencies import get_auth_user, get_franchisee_manager
from backend.models import User, UserRole, FranchiseLocation

router = APIRouter(prefix="/locations", tags=["locations"])


class LocationCreate(BaseModel):
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    is_primary: bool = False


class LocationUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    is_primary: Optional[bool] = None
    is_active: Optional[bool] = None


class LocationResponse(BaseModel):
    id: UUID
    franchise_id: UUID
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    is_primary: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=list[LocationResponse])
async def list_locations(
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """List all active locations for the current franchise."""
    franchise_id = user.franchise_id
    locations = (
        db.query(FranchiseLocation)
        .filter(
            FranchiseLocation.franchise_id == franchise_id,
            FranchiseLocation.is_active == True,
        )
        .order_by(FranchiseLocation.is_primary.desc(), FranchiseLocation.name)
        .all()
    )
    return [LocationResponse.from_orm(loc) for loc in locations]


@router.post("", response_model=LocationResponse, status_code=status.HTTP_201_CREATED)
async def create_location(
    data: LocationCreate,
    user: User = Depends(get_franchisee_manager),
    db: Session = Depends(get_db),
):
    """Create a new location for the current franchise."""
    # If marking as primary, clear existing primary
    if data.is_primary:
        existing_primary = db.query(FranchiseLocation).filter(
            FranchiseLocation.franchise_id == user.franchise_id,
            FranchiseLocation.is_primary == True,
        ).first()
        if existing_primary:
            existing_primary.is_primary = False

    loc = FranchiseLocation(
        franchise_id=user.franchise_id,
        name=data.name,
        address=data.address,
        city=data.city,
        state=data.state,
        postal_code=data.postal_code,
        country=data.country,
        phone=data.phone,
        is_primary=data.is_primary,
    )
    db.add(loc)
    db.commit()
    db.refresh(loc)
    return LocationResponse.from_orm(loc)


@router.put("/{location_id}", response_model=LocationResponse)
async def update_location(
    location_id: str,
    data: LocationUpdate,
    user: User = Depends(get_franchisee_manager),
    db: Session = Depends(get_db),
):
    """Update a location. Franchise managers can only update their own franchise's locations."""
    loc = db.query(FranchiseLocation).filter(FranchiseLocation.id == location_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    if user.role != UserRole.SUPER_ADMIN and loc.franchise_id != user.franchise_id:
        raise HTTPException(status_code=403, detail="Cannot update another franchise's location")

    if data.name is not None:
        loc.name = data.name
    if data.address is not None:
        loc.address = data.address
    if data.city is not None:
        loc.city = data.city
    if data.state is not None:
        loc.state = data.state
    if data.postal_code is not None:
        loc.postal_code = data.postal_code
    if data.country is not None:
        loc.country = data.country
    if data.phone is not None:
        loc.phone = data.phone
    if data.is_active is not None:
        loc.is_active = data.is_active
    if data.is_primary is not None and data.is_primary:
        # Clear existing primary
        db.query(FranchiseLocation).filter(
            FranchiseLocation.franchise_id == loc.franchise_id,
            FranchiseLocation.is_primary == True,
            FranchiseLocation.id != loc.id,
        ).update({"is_primary": False})
        loc.is_primary = True

    db.commit()
    db.refresh(loc)
    return LocationResponse.from_orm(loc)


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_location(
    location_id: str,
    user: User = Depends(get_franchisee_manager),
    db: Session = Depends(get_db),
):
    """Soft-delete a location (mark inactive)."""
    loc = db.query(FranchiseLocation).filter(FranchiseLocation.id == location_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    if user.role != UserRole.SUPER_ADMIN and loc.franchise_id != user.franchise_id:
        raise HTTPException(status_code=403, detail="Cannot delete another franchise's location")
    loc.is_active = False
    db.commit()
