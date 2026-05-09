"""Customer API routes."""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.dependencies import get_auth_user
from backend.models import User, Customer
from backend.schemas import CustomerCreate, CustomerResponse

router = APIRouter(prefix="/customers", tags=["customers"])


@router.post("", response_model=CustomerResponse)
async def create_customer(
    customer_data: CustomerCreate,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Create a new customer."""

    # Check if customer with this email already exists for the franchise
    existing = (
        db.query(Customer)
        .filter(
            Customer.franchise_id == user.franchise_id,
            Customer.email == customer_data.email,
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Customer with this email already exists",
        )

    customer = Customer(
        franchise_id=user.franchise_id,
        email=customer_data.email,
        phone=customer_data.phone,
        first_name=customer_data.first_name,
        last_name=customer_data.last_name,
        address=customer_data.address,
        city=customer_data.city,
        state=customer_data.state,
        postal_code=customer_data.postal_code,
        country=customer_data.country,
    )

    db.add(customer)
    db.commit()
    db.refresh(customer)

    return CustomerResponse.from_orm(customer)


@router.get("", response_model=list[CustomerResponse])
async def list_customers(
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """List all customers for the franchise."""

    customers = (
        db.query(Customer)
        .filter(Customer.franchise_id == user.franchise_id)
        .all()
    )

    return [CustomerResponse.from_orm(c) for c in customers]


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: UUID,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Get a specific customer."""

    customer = (
        db.query(Customer)
        .filter(
            Customer.id == customer_id,
            Customer.franchise_id == user.franchise_id,
        )
        .first()
    )

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )

    return CustomerResponse.from_orm(customer)


@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: UUID,
    customer_data: CustomerCreate,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Update a customer."""

    customer = (
        db.query(Customer)
        .filter(
            Customer.id == customer_id,
            Customer.franchise_id == user.franchise_id,
        )
        .first()
    )

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )

    # Update fields
    for field, value in customer_data.dict().items():
        setattr(customer, field, value)

    db.commit()
    db.refresh(customer)

    return CustomerResponse.from_orm(customer)


@router.delete("/{customer_id}")
async def delete_customer(
    customer_id: UUID,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Delete a customer."""

    customer = (
        db.query(Customer)
        .filter(
            Customer.id == customer_id,
            Customer.franchise_id == user.franchise_id,
        )
        .first()
    )

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )

    db.delete(customer)
    db.commit()

    return {"status": "deleted"}
