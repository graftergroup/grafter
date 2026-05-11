"""Pydantic models for request/response validation."""

from datetime import datetime
from uuid import UUID
from typing import Optional

from pydantic import BaseModel, EmailStr

from backend.models import UserRole, JobStatus, BookingStatus, PaymentStatus


# ==================== User & Auth ====================


class UserBase(BaseModel):
    """Base user data."""

    email: EmailStr
    first_name: str
    last_name: str
    phone: Optional[str] = None
    role: UserRole = UserRole.CUSTOMER


class UserCreate(UserBase):
    """User creation request."""

    password: str
    franchise_id: Optional[UUID] = None  # For admin registration


class UserResponse(UserBase):
    """User response."""

    id: UUID
    franchise_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    """Login request."""

    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    """Login response."""

    access_token: str
    refresh_token: str
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    """Refresh token request."""

    refresh_token: str


class APIKeyCreate(BaseModel):
    """API key creation request."""

    name: str


class APIKeyResponse(BaseModel):
    """API key response."""

    id: UUID
    key: str
    name: str
    is_active: bool
    created_at: datetime
    last_used_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ==================== Franchise ====================


class FranchiseBase(BaseModel):
    """Base franchise data."""

    name: str
    slug: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None


class FranchiseCreate(FranchiseBase):
    """Franchise creation request."""

    pass


class FranchiseResponse(FranchiseBase):
    """Franchise response."""

    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==================== Customer ====================


class CustomerBase(BaseModel):
    """Base customer data."""

    email: str
    phone: str
    first_name: str
    last_name: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None


class CustomerCreate(CustomerBase):
    """Customer creation request."""

    pass


class CustomerResponse(CustomerBase):
    """Customer response."""

    id: UUID
    franchise_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==================== Service ====================


class ServiceBase(BaseModel):
    """Base service data."""

    name: str
    description: Optional[str] = None
    base_price: float
    duration_minutes: int


class ServiceCreate(ServiceBase):
    """Service creation request."""

    pass


class ServiceResponse(ServiceBase):
    """Service response."""

    id: UUID
    franchise_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==================== Booking ====================


class BookingBase(BaseModel):
    """Base booking data."""

    customer_id: UUID
    service_id: UUID
    scheduled_date: datetime
    notes: Optional[str] = None


class BookingCreate(BookingBase):
    """Booking creation request."""

    pass


class BookingUpdate(BaseModel):
    """Booking update request."""

    status: Optional[BookingStatus] = None
    notes: Optional[str] = None


class BookingResponse(BookingBase):
    """Booking response."""

    id: UUID
    franchise_id: UUID
    status: BookingStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==================== Job ====================


class JobBase(BaseModel):
    """Base job data."""

    booking_id: Optional[UUID] = None
    assigned_technician_id: Optional[UUID] = None
    vehicle_id: Optional[UUID] = None
    scheduled_date: datetime
    notes: Optional[str] = None


class JobCreate(JobBase):
    """Job creation request."""

    pass


class JobUpdate(BaseModel):
    """Job update request."""

    status: Optional[JobStatus] = None
    assigned_technician_id: Optional[UUID] = None
    vehicle_id: Optional[UUID] = None
    notes: Optional[str] = None


class JobResponse(JobBase):
    """Job response."""

    id: UUID
    franchise_id: UUID
    status: JobStatus
    completed_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==================== Vehicle ====================


class VehicleBase(BaseModel):
    """Base vehicle data."""

    plate_number: str
    make: str
    model: str
    year: int
    vin: Optional[str] = None


class VehicleCreate(VehicleBase):
    """Vehicle creation request."""

    pass


class VehicleLocationUpdate(BaseModel):
    """Vehicle location update request."""

    latitude: float
    longitude: float


class VehicleResponse(VehicleBase):
    """Vehicle response."""

    id: UUID
    franchise_id: UUID
    current_latitude: Optional[float] = None
    current_longitude: Optional[float] = None
    last_location_update: Optional[datetime] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==================== Invoice ====================


class InvoiceBase(BaseModel):
    """Base invoice data."""

    customer_id: UUID
    amount: float
    tax: float = 0.0
    description: Optional[str] = None
    due_date: Optional[datetime] = None


class InvoiceCreate(InvoiceBase):
    """Invoice creation request."""

    pass


class InvoiceResponse(InvoiceBase):
    """Invoice response."""

    id: UUID
    franchise_id: UUID
    invoice_number: str
    total: float
    issued_date: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==================== Payment ====================


class PaymentBase(BaseModel):
    """Base payment data."""

    invoice_id: UUID
    amount: float
    payment_method: Optional[str] = None
    notes: Optional[str] = None


class PaymentCreate(PaymentBase):
    """Payment creation request."""

    pass


class PaymentResponse(PaymentBase):
    """Payment response."""

    id: UUID
    status: PaymentStatus
    transaction_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==================== Staff Management ====================


class StaffCreate(BaseModel):
    """Staff user creation request."""

    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    role: UserRole  # TECHNICIAN, OFFICE_STAFF, etc.
    staff_type: Optional[str] = None  # technician, office_manager, admin, etc.
    franchise_id: Optional[UUID] = None  # For superadmin creating staff; uses current franchise if not provided


class StaffInviteRequest(BaseModel):
    """Staff invitation request — creates pending user, returns invite link."""

    email: EmailStr
    first_name: str
    last_name: str
    role: UserRole
    staff_type: Optional[str] = None
    franchise_id: Optional[UUID] = None  # Superadmin only


class InviteTokenResponse(BaseModel):
    """Response after creating an invite."""

    invite_token: str
    invite_url: str
    email: str
    expires_at: datetime


class InviteAcceptRequest(BaseModel):
    """Accept an invitation and set password."""

    token: str
    password: str


class StaffUpdate(BaseModel):
    """Staff user update request."""

    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[UserRole] = None
    staff_type: Optional[str] = None
    is_active: Optional[bool] = None


class StaffResponse(UserBase):
    """Staff user response."""

    id: UUID
    franchise_id: UUID
    staff_type: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==================== Franchise Management ====================


class FranchiseCreateRequest(BaseModel):
    """Superadmin franchise creation request."""

    name: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    notes: Optional[str] = None


class FranchiseUpdateRequest(BaseModel):
    """Superadmin franchise update request."""

    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    is_active: Optional[bool] = None
    approval_status: Optional[str] = None  # pending, approved, rejected
    subscription_status: Optional[str] = None  # active, suspended, cancelled
    notes: Optional[str] = None


class FranchiseDetailResponse(FranchiseBase):
    """Detailed franchise response (superadmin view)."""

    id: UUID
    is_active: bool
    approval_status: str
    subscription_status: str
    approved_at: Optional[datetime] = None
    notes: Optional[str] = None
    commission_rate: float = 0.10
    billing_email: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==================== Franchise Billing ====================


class BillingRecordResponse(BaseModel):
    """Franchise billing record response."""

    id: UUID
    franchise_id: UUID
    franchise_name: Optional[str] = None
    period_start: datetime
    period_end: datetime
    gross_revenue: float
    commission_rate: float
    commission_amount: float
    module_fees: float = 0.0
    status: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class GenerateBillingRequest(BaseModel):
    """Request to generate billing records for a date range."""

    period_start: datetime
    period_end: datetime
    franchise_id: Optional[UUID] = None  # None = generate for all franchises


class UpdateBillingStatusRequest(BaseModel):
    """Update billing record status."""

    status: str  # pending, invoiced, paid
    notes: Optional[str] = None


class UpdateCommissionRequest(BaseModel):
    """Update franchise commission rate."""

    commission_rate: float
    billing_email: Optional[str] = None


# ==================== Modules ====================


class ModuleCreate(BaseModel):
    """Create a new platform module."""

    name: str
    slug: str
    description: Optional[str] = None
    monthly_price: float = 0.0
    is_available: bool = True


class ModuleUpdate(BaseModel):
    """Update an existing module."""

    name: Optional[str] = None
    description: Optional[str] = None
    monthly_price: Optional[float] = None
    is_available: Optional[bool] = None


class ModuleResponse(BaseModel):
    """Module response (superadmin view)."""

    id: UUID
    name: str
    slug: str
    description: Optional[str] = None
    monthly_price: float
    is_available: bool
    active_franchise_count: int = 0
    pending_request_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class FranchiseModuleResponse(BaseModel):
    """A franchise's subscription to a module."""

    id: UUID
    franchise_id: UUID
    franchise_name: Optional[str] = None
    module_id: UUID
    module_name: str
    module_description: Optional[str] = None
    module_slug: str
    status: str  # active, pending, rejected, inactive
    custom_price: Optional[float] = None
    effective_price: float           # custom_price ?? module.monthly_price
    requested_at: Optional[datetime] = None
    activated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FranchiseModuleApproval(BaseModel):
    """Superadmin approves or rejects a module request."""

    status: str          # active or rejected
    custom_price: Optional[float] = None


class FranchiseModuleToggle(BaseModel):
    """Superadmin directly toggles/sets a module for a franchise."""

    status: str          # active or inactive
    custom_price: Optional[float] = None
