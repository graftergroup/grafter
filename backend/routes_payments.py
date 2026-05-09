"""Payment management API routes."""

from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.dependencies import get_auth_user
from backend.models import User, Payment, Invoice, PaymentStatus
from backend.schemas import PaymentCreate, PaymentResponse

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("", response_model=PaymentResponse)
async def create_payment(
    payment_data: PaymentCreate,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Record a payment for an invoice."""

    # Verify invoice belongs to franchise
    invoice = (
        db.query(Invoice)
        .filter(
            Invoice.id == payment_data.invoice_id,
            Invoice.franchise_id == user.franchise_id,
        )
        .first()
    )

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    payment = Payment(
        invoice_id=payment_data.invoice_id,
        amount=payment_data.amount,
        status=PaymentStatus.COMPLETED,
        payment_method=payment_data.payment_method,
        notes=payment_data.notes,
    )

    db.add(payment)
    db.commit()
    db.refresh(payment)

    return PaymentResponse.from_orm(payment)


@router.get("", response_model=list[PaymentResponse])
async def list_payments(
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """List all payments for the franchise."""

    from sqlalchemy import join

    payments = (
        db.query(Payment)
        .join(Invoice)
        .filter(Invoice.franchise_id == user.franchise_id)
        .order_by(Payment.created_at.desc())
        .all()
    )

    return [PaymentResponse.from_orm(p) for p in payments]


@router.get("/invoice/{invoice_id}", response_model=list[PaymentResponse])
async def list_invoice_payments(
    invoice_id: UUID,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Get all payments for a specific invoice."""

    # Verify invoice belongs to franchise
    invoice = (
        db.query(Invoice)
        .filter(
            Invoice.id == invoice_id,
            Invoice.franchise_id == user.franchise_id,
        )
        .first()
    )

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    payments = (
        db.query(Payment)
        .filter(Payment.invoice_id == invoice_id)
        .order_by(Payment.created_at.desc())
        .all()
    )

    return [PaymentResponse.from_orm(p) for p in payments]


@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: UUID,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Get a specific payment."""

    from sqlalchemy import join

    payment = (
        db.query(Payment)
        .join(Invoice)
        .filter(
            Payment.id == payment_id,
            Invoice.franchise_id == user.franchise_id,
        )
        .first()
    )

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found",
        )

    return PaymentResponse.from_orm(payment)


@router.put("/{payment_id}", response_model=PaymentResponse)
async def update_payment(
    payment_id: UUID,
    payment_data: PaymentCreate,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Update a payment."""

    from sqlalchemy import join

    payment = (
        db.query(Payment)
        .join(Invoice)
        .filter(
            Payment.id == payment_id,
            Invoice.franchise_id == user.franchise_id,
        )
        .first()
    )

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found",
        )

    # Update fields
    payment.amount = payment_data.amount
    payment.payment_method = payment_data.payment_method
    payment.notes = payment_data.notes

    db.commit()
    db.refresh(payment)

    return PaymentResponse.from_orm(payment)


@router.delete("/{payment_id}")
async def delete_payment(
    payment_id: UUID,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Delete a payment."""

    from sqlalchemy import join

    payment = (
        db.query(Payment)
        .join(Invoice)
        .filter(
            Payment.id == payment_id,
            Invoice.franchise_id == user.franchise_id,
        )
        .first()
    )

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found",
        )

    db.delete(payment)
    db.commit()

    return {"status": "deleted"}
