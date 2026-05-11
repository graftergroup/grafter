"""Staff management API routes."""

import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.auth import hash_password
from backend.dependencies import get_auth_user, get_superadmin_user, get_franchisee_manager, get_effective_permissions
from backend.models import User, UserRole, Franchise, UserPermission
from backend.schemas import StaffCreate, StaffUpdate, StaffResponse, StaffInviteRequest, InviteTokenResponse, PermissionEntry, PermissionUpdate

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


@router.post("/invite", response_model=InviteTokenResponse, status_code=status.HTTP_201_CREATED)
async def invite_staff(
    invite_data: StaffInviteRequest,
    request: Request,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """
    Invite a new staff member by email.
    Creates a pending (inactive) user record and returns an invite link.

    - Superadmin: can invite to any franchise
    - Franchisee manager: invites to their own franchise only
    """
    # Check existing user
    existing = db.query(User).filter(User.email == invite_data.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User with this email already exists")

    # Determine franchise
    if user.role == UserRole.SUPER_ADMIN:
        if invite_data.franchise_id:
            franchise = db.query(Franchise).filter(Franchise.id == invite_data.franchise_id).first()
            if not franchise:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Franchise not found")
            franchise_id = invite_data.franchise_id
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="franchise_id required for superadmin")
    else:
        if user.role not in [UserRole.FRANCHISE_MANAGER, UserRole.ADMIN]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorised to invite staff")
        franchise_id = user.franchise_id

    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=72)

    new_user = User(
        franchise_id=franchise_id,
        email=invite_data.email,
        first_name=invite_data.first_name,
        last_name=invite_data.last_name,
        password_hash=hash_password(secrets.token_urlsafe(16)),  # Temporary placeholder
        role=invite_data.role,
        staff_type=invite_data.staff_type,
        is_active=False,
        invitation_token=token,
        invitation_token_expires=expires_at,
        invited_by_id=user.id,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    base_url = str(request.base_url).rstrip("/")
    invite_url = f"{base_url}/accept-invite?token={token}"

    return InviteTokenResponse(
        invite_token=token,
        invite_url=invite_url,
        email=invite_data.email,
        expires_at=expires_at,
    )


# ─── Permissions endpoints ─────────────────────────────────────────────────


@router.get("/me/permissions", response_model=list[PermissionEntry])
async def get_my_permissions(
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Return the calling user's effective permissions (role defaults + overrides)."""
    return get_effective_permissions(user, db)


@router.get("/{user_id}/permissions", response_model=list[PermissionEntry])
async def get_staff_permissions(
    user_id: str,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Return effective permissions for a specific staff member."""
    staff = db.query(User).filter(User.id == user_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff user not found")
    if user.role != UserRole.SUPER_ADMIN and user.franchise_id != staff.franchise_id:
        raise HTTPException(status_code=403, detail="Cannot access staff from another franchise")
    return get_effective_permissions(staff, db)


@router.put("/{user_id}/permissions", response_model=list[PermissionEntry])
async def update_staff_permissions(
    user_id: str,
    data: PermissionUpdate,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """
    Bulk-upsert permission overrides for a staff member.
    Only franchise managers, admins, and superadmins can do this.
    """
    if user.role not in [UserRole.SUPER_ADMIN, UserRole.FRANCHISE_MANAGER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorised to manage permissions")

    staff = db.query(User).filter(User.id == user_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff user not found")
    if user.role != UserRole.SUPER_ADMIN and user.franchise_id != staff.franchise_id:
        raise HTTPException(status_code=403, detail="Cannot manage staff from another franchise")

    for entry in data.permissions:
        existing = db.query(UserPermission).filter(
            UserPermission.user_id == staff.id,
            UserPermission.permission_slug == entry.permission_slug,
        ).first()
        if existing:
            existing.can_view   = entry.can_view
            existing.can_create = entry.can_create
            existing.can_update = entry.can_update
            existing.can_delete = entry.can_delete
            existing.updated_at = datetime.utcnow()
        else:
            new_perm = UserPermission(
                user_id=staff.id,
                franchise_id=staff.franchise_id,
                permission_slug=entry.permission_slug,
                can_view=entry.can_view,
                can_create=entry.can_create,
                can_update=entry.can_update,
                can_delete=entry.can_delete,
                granted_by_id=user.id,
            )
            db.add(new_perm)

    db.commit()
    return get_effective_permissions(staff, db)

