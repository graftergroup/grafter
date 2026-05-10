"""SQLAlchemy ORM models for the application."""

from datetime import datetime
from uuid import uuid4
import enum

from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    DateTime,
    Boolean,
    ForeignKey,
    Text,
    Enum,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from backend.db import Base


class UserRole(str, enum.Enum):
    """User role enumeration."""

    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    FRANCHISE_MANAGER = "franchise_manager"
    OFFICE_STAFF = "office_staff"
    TECHNICIAN = "technician"
    CUSTOMER = "customer"


class JobStatus(str, enum.Enum):
    """Job status enumeration."""

    PENDING = "pending"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class BookingStatus(str, enum.Enum):
    """Booking status enumeration."""

    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class PaymentStatus(str, enum.Enum):
    """Payment status enumeration."""

    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class Franchise(Base):
    """Franchise model for multi-tenancy."""

    __tablename__ = "franchises"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    name = Column(String(255), nullable=False, unique=True)
    slug = Column(String(255), nullable=False, unique=True)
    email = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    postal_code = Column(String(20), nullable=True)
    country = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    approval_status = Column(String(50), default="approved")  # pending, approved, rejected
    subscription_status = Column(String(50), default="active")  # active, suspended, cancelled
    approved_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    users = relationship("User", back_populates="franchise", cascade="all, delete-orphan")
    customers = relationship(
        "Customer", back_populates="franchise", cascade="all, delete-orphan"
    )
    services = relationship(
        "Service", back_populates="franchise", cascade="all, delete-orphan"
    )
    jobs = relationship("Job", back_populates="franchise", cascade="all, delete-orphan")
    vehicles = relationship(
        "Vehicle", back_populates="franchise", cascade="all, delete-orphan"
    )
    invoices = relationship(
        "Invoice", back_populates="franchise", cascade="all, delete-orphan"
    )


class User(Base):
    """User model."""

    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    franchise_id = Column(UUID(as_uuid=True), ForeignKey("franchises.id"), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=True)
    role = Column(Enum(UserRole), default=UserRole.CUSTOMER)
    staff_type = Column(String(50), nullable=True)  # technician, office_manager, etc.
    is_active = Column(Boolean, default=True)
    # Invitation fields
    invitation_token = Column(String(255), nullable=True, unique=True)
    invitation_token_expires = Column(DateTime, nullable=True)
    invited_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    invitation_accepted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    franchise = relationship("Franchise", back_populates="users")
    api_keys = relationship("APIKey", back_populates="user", cascade="all, delete-orphan")
    jobs_assigned = relationship("Job", back_populates="assigned_technician")
    invited_by = relationship("User", remote_side="User.id", foreign_keys=[invited_by_id])


class APIKey(Base):
    """API Key model for service-to-service authentication."""

    __tablename__ = "api_keys"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    key = Column(String(255), nullable=False, unique=True)
    name = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="api_keys")


class Customer(Base):
    """Customer model."""

    __tablename__ = "customers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    franchise_id = Column(UUID(as_uuid=True), ForeignKey("franchises.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    email = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    postal_code = Column(String(20), nullable=True)
    country = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    franchise = relationship("Franchise", back_populates="customers")
    bookings = relationship("Booking", back_populates="customer", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="customer", cascade="all, delete-orphan")


class Service(Base):
    """Service model (e.g., lawn mowing, cleaning)."""

    __tablename__ = "services"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    franchise_id = Column(UUID(as_uuid=True), ForeignKey("franchises.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    base_price = Column(Float, nullable=False)
    duration_minutes = Column(Integer, nullable=False)  # Estimated duration
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    franchise = relationship("Franchise", back_populates="services")
    bookings = relationship("Booking", back_populates="service", cascade="all, delete-orphan")


class Booking(Base):
    """Service booking model."""

    __tablename__ = "bookings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    franchise_id = Column(UUID(as_uuid=True), ForeignKey("franchises.id"), nullable=False)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    service_id = Column(UUID(as_uuid=True), ForeignKey("services.id"), nullable=False)
    scheduled_date = Column(DateTime, nullable=False)
    status = Column(Enum(BookingStatus), default=BookingStatus.PENDING)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    franchise = relationship("Franchise")
    customer = relationship("Customer", back_populates="bookings")
    service = relationship("Service", back_populates="bookings")
    job = relationship("Job", back_populates="booking", uselist=False, cascade="all, delete-orphan")


class Job(Base):
    """Job model (actual work to be done)."""

    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    franchise_id = Column(UUID(as_uuid=True), ForeignKey("franchises.id"), nullable=False)
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=True)
    assigned_technician_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.id"), nullable=True)
    status = Column(Enum(JobStatus), default=JobStatus.PENDING)
    scheduled_date = Column(DateTime, nullable=False)
    completed_date = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    franchise = relationship("Franchise", back_populates="jobs")
    booking = relationship("Booking", back_populates="job")
    assigned_technician = relationship("User", back_populates="jobs_assigned")
    vehicle = relationship("Vehicle", back_populates="jobs")


class Vehicle(Base):
    """Vehicle model for fleet management."""

    __tablename__ = "vehicles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    franchise_id = Column(UUID(as_uuid=True), ForeignKey("franchises.id"), nullable=False)
    plate_number = Column(String(20), nullable=False, unique=True)
    make = Column(String(100), nullable=False)
    model = Column(String(100), nullable=False)
    year = Column(Integer, nullable=False)
    vin = Column(String(17), nullable=True)
    current_latitude = Column(Float, nullable=True)
    current_longitude = Column(Float, nullable=True)
    last_location_update = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    franchise = relationship("Franchise", back_populates="vehicles")
    jobs = relationship("Job", back_populates="vehicle")


class Invoice(Base):
    """Invoice model for accounting."""

    __tablename__ = "invoices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    franchise_id = Column(UUID(as_uuid=True), ForeignKey("franchises.id"), nullable=False)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    invoice_number = Column(String(50), nullable=False, unique=True)
    amount = Column(Float, nullable=False)
    tax = Column(Float, default=0.0)
    total = Column(Float, nullable=False)
    description = Column(Text, nullable=True)
    issued_date = Column(DateTime, default=datetime.utcnow)
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    franchise = relationship("Franchise", back_populates="invoices")
    customer = relationship("Customer", back_populates="invoices")
    payments = relationship("Payment", back_populates="invoice", cascade="all, delete-orphan")


class Payment(Base):
    """Payment model."""

    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    payment_method = Column(String(50), nullable=True)  # credit_card, bank_transfer, cash
    transaction_id = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    invoice = relationship("Invoice", back_populates="payments")
