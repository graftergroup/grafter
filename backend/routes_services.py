"""Service API routes."""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.dependencies import get_auth_user
from backend.models import User, Service
from backend.schemas import ServiceCreate, ServiceResponse

router = APIRouter(prefix="/services", tags=["services"])


@router.post("", response_model=ServiceResponse)
async def create_service(
    service_data: ServiceCreate,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Create a new service."""

    service = Service(
        franchise_id=user.franchise_id,
        name=service_data.name,
        description=service_data.description,
        base_price=service_data.base_price,
        duration_minutes=service_data.duration_minutes,
    )

    db.add(service)
    db.commit()
    db.refresh(service)

    return ServiceResponse.from_orm(service)


@router.get("", response_model=list[ServiceResponse])
async def list_services(
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """List all services for the franchise."""

    services = (
        db.query(Service)
        .filter(Service.franchise_id == user.franchise_id)
        .all()
    )

    return [ServiceResponse.from_orm(s) for s in services]


@router.get("/{service_id}", response_model=ServiceResponse)
async def get_service(
    service_id: UUID,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Get a specific service."""

    service = (
        db.query(Service)
        .filter(
            Service.id == service_id,
            Service.franchise_id == user.franchise_id,
        )
        .first()
    )

    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found",
        )

    return ServiceResponse.from_orm(service)


@router.put("/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: UUID,
    service_data: ServiceCreate,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Update a service."""

    service = (
        db.query(Service)
        .filter(
            Service.id == service_id,
            Service.franchise_id == user.franchise_id,
        )
        .first()
    )

    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found",
        )

    # Update fields
    for field, value in service_data.dict().items():
        setattr(service, field, value)

    db.commit()
    db.refresh(service)

    return ServiceResponse.from_orm(service)


@router.delete("/{service_id}")
async def delete_service(
    service_id: UUID,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Delete a service."""

    service = (
        db.query(Service)
        .filter(
            Service.id == service_id,
            Service.franchise_id == user.franchise_id,
        )
        .first()
    )

    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found",
        )

    db.delete(service)
    db.commit()

    return {"status": "deleted"}
