"""Staff management API routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.auth import hash_password
from backend.dependencies import get_auth_user, get_superadmin_user, get_franchisee_manager
from backend.models import User, UserRole, Franchise
from backend.schemas import StaffCreate, StaffUpdate, StaffResponse

router = APIRouter(prefix="/staff", tags=["staff"])


@router.get("", response_model=list[StaffResponse])
async def list_staff(
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
    franchise_id: str = None,
):
    """
    List staff users.
    
    - Superadmin: can filter by franchise_id or get all staff
    - Franchisee manager: only sees their own franchise's staff
    """

    if user.role == UserRole.SUPER_ADMIN:
        # Superadmin can see all staff or filter by franchise
        if franchise_id:
            staff = db.query(User).filter(
                User.franchise_id == franchise_id,
                User.role.in_([UserRole.TECHNICIAN, UserRole.OFFICE_STAFF]),
            ).all()
        else:
            staff = db.query(User).filter(
                User.role.in_([UserRole.TECHNICIAN, UserRole.OFFICE_STAFF])
            ).all()
    else:
        # Franchisee manager only sees their own staff
        staff = db.query(User).filter(
            User.franchise_id == user.franchise_id,
            User.role.in_([UserRole.TECHNICIAN, UserRole.OFFICE_STAFF]),
        ).all()

    return [StaffResponse.from_orm(s) for s in staff]


@router.post("", response_model=StaffResponse, status_code=status.HTTP_201_CREATED)
async def create_staff(
    staff_data: StaffCreate,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """
    Create a new staff user.
    
    - Superadmin: can create staff in any franchise
    - Franchisee manager: can only create staff in their own franchise
    """

    # Check if user already exists
    existing_user = db.query(User).filter(User.email == staff_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email already exists",
        )

    # Determine franchise_id
    if user.role == UserRole.SUPER_ADMIN:
        if staff_data.franchise_id:
            franchise_id = staff_data.franchise_id
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Superadmin must specify franchise_id",
            )
        # Verify franchise exists
        franchise = db.query(Franchise).filter(Franchise.id == franchise_id).first()
        if not franchise:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Franchise not found",
            )
    else:
        # Franchisee manager creates staff in their own franchise
        franchise_id = user.franchise_id

    # Create new staff user
    new_staff = User(
        email=staff_data.email,
        password_hash=hash_password(staff_data.password),
        first_name=staff_data.first_name,
        last_name=staff_data.last_name,
        phone=staff_data.phone,
        role=staff_data.role,
        staff_type=staff_data.staff_type,
        franchise_id=franchise_id,
    )

    db.add(new_staff)
    db.commit()
    db.refresh(new_staff)

    return StaffResponse.from_orm(new_staff)


@router.get("/{user_id}", response_model=StaffResponse)
async def get_staff(
    user_id: str,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """
    Get a specific staff user.
    
    - Superadmin: can view any staff
    - Franchisee manager: can only view staff in their franchise
    """

    staff = db.query(User).filter(User.id == user_id).first()

    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff user not found",
        )

    # Check access permissions
    if user.role != UserRole.SUPER_ADMIN and user.franchise_id != staff.franchise_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access staff from another franchise",
        )

    return StaffResponse.from_orm(staff)


@router.put("/{user_id}", response_model=StaffResponse)
async def update_staff(
    user_id: str,
    staff_data: StaffUpdate,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """
    Update a staff user.
    
    - Superadmin: can update any staff
    - Franchisee manager: can only update staff in their franchise
    """

    staff = db.query(User).filter(User.id == user_id).first()

    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff user not found",
        )

    # Check access permissions
    if user.role != UserRole.SUPER_ADMIN and user.franchise_id != staff.franchise_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot update staff from another franchise",
        )

    # Update fields
    if staff_data.first_name is not None:
        staff.first_name = staff_data.first_name
    if staff_data.last_name is not None:
        staff.last_name = staff_data.last_name
    if staff_data.phone is not None:
        staff.phone = staff_data.phone
    if staff_data.role is not None:
        staff.role = staff_data.role
    if staff_data.staff_type is not None:
        staff.staff_type = staff_data.staff_type
    if staff_data.is_active is not None:
        staff.is_active = staff_data.is_active

    db.commit()
    db.refresh(staff)

    return StaffResponse.from_orm(staff)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_staff(
    user_id: str,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """
    Delete a staff user (soft delete: mark as inactive).
    
    - Superadmin: can delete any staff
    - Franchisee manager: can only delete staff in their franchise
    """

    staff = db.query(User).filter(User.id == user_id).first()

    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff user not found",
        )

    # Check access permissions
    if user.role != UserRole.SUPER_ADMIN and user.franchise_id != staff.franchise_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete staff from another franchise",
        )

    # Soft delete - mark as inactive
    staff.is_active = False
    db.commit()
