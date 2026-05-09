"""Invoice management API routes."""

from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.dependencies import get_auth_user
from backend.models import User, Invoice, Customer
from backend.schemas import InvoiceCreate, InvoiceResponse

router = APIRouter(prefix="/invoices", tags=["invoices"])


def generate_invoice_number(db: Session, franchise_id: UUID) -> str:
    """Generate unique invoice number for franchise."""
    from sqlalchemy import func
    
    count = (
        db.query(func.count(Invoice.id))
        .filter(Invoice.franchise_id == franchise_id)
        .scalar()
        or 0
    )
    
    return f"INV-{franchise_id.hex[:8].upper()}-{count + 1:04d}"


@router.post("", response_model=InvoiceResponse)
async def create_invoice(
    invoice_data: InvoiceCreate,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Create a new invoice."""

    # Verify customer belongs to franchise
    customer = (
        db.query(Customer)
        .filter(
            Customer.id == invoice_data.customer_id,
            Customer.franchise_id == user.franchise_id,
        )
        .first()
    )

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )

    # Calculate total
    total = invoice_data.amount + invoice_data.tax

    invoice = Invoice(
        franchise_id=user.franchise_id,
        customer_id=invoice_data.customer_id,
        invoice_number=generate_invoice_number(db, user.franchise_id),
        amount=invoice_data.amount,
        tax=invoice_data.tax,
        total=total,
        description=invoice_data.description,
        due_date=invoice_data.due_date,
    )

    db.add(invoice)
    db.commit()
    db.refresh(invoice)

    return InvoiceResponse.from_orm(invoice)


@router.get("", response_model=list[InvoiceResponse])
async def list_invoices(
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """List all invoices for the franchise."""

    invoices = (
        db.query(Invoice)
        .filter(Invoice.franchise_id == user.franchise_id)
        .order_by(Invoice.created_at.desc())
        .all()
    )

    return [InvoiceResponse.from_orm(inv) for inv in invoices]


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: UUID,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Get a specific invoice."""

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

    return InvoiceResponse.from_orm(invoice)


@router.put("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: UUID,
    invoice_data: InvoiceCreate,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Update an invoice."""

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

    # Update fields
    invoice.amount = invoice_data.amount
    invoice.tax = invoice_data.tax
    invoice.total = invoice_data.amount + invoice_data.tax
    invoice.description = invoice_data.description
    invoice.due_date = invoice_data.due_date

    db.commit()
    db.refresh(invoice)

    return InvoiceResponse.from_orm(invoice)


@router.delete("/{invoice_id}")
async def delete_invoice(
    invoice_id: UUID,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Delete an invoice."""

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

    db.delete(invoice)
    db.commit()

    return {"status": "deleted"}
