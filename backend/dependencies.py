"""Authentication middleware and dependencies."""

from typing import Optional
from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.auth import verify_token, verify_api_key, get_user_from_token
from backend.models import User, UserRole, UserPermission

# ─── Permission slugs ────────────────────────────────────────────────────────
PERMISSION_SLUGS = [
    "dashboard", "revenue", "customers", "bookings",
    "vehicles", "locations", "modules", "settings", "team", "hr",
]

_ALL_ACTIONS = {"can_view": True, "can_create": True, "can_update": True, "can_delete": True}
_VIEW_ONLY   = {"can_view": True, "can_create": False, "can_update": False, "can_delete": False}
_DENIED      = {"can_view": False, "can_create": False, "can_update": False, "can_delete": False}

ROLE_DEFAULTS: dict[str, dict[str, dict]] = {
    "franchise_manager": {s: _ALL_ACTIONS.copy() for s in PERMISSION_SLUGS},
    "admin":             {s: _ALL_ACTIONS.copy() for s in PERMISSION_SLUGS},
    "office_staff": {
        "dashboard":  _VIEW_ONLY.copy(),
        "customers":  {"can_view": True, "can_create": True, "can_update": True, "can_delete": False},
        "bookings":   {"can_view": True, "can_create": True, "can_update": False, "can_delete": False},
        **{s: _DENIED.copy() for s in PERMISSION_SLUGS if s not in ("dashboard", "customers", "bookings")},
    },
    "technician": {
        "dashboard":  _VIEW_ONLY.copy(),
        **{s: _DENIED.copy() for s in PERMISSION_SLUGS if s != "dashboard"},
    },
}


def get_effective_permissions(user: User, db: Session) -> list[dict]:
    """
    Merge role defaults with per-user DB overrides.
    Returns a list of dicts with permission_slug + CRUD booleans.
    """
    role_str = user.role.value if hasattr(user.role, "value") else str(user.role)
    defaults = ROLE_DEFAULTS.get(role_str, {s: _ALL_ACTIONS.copy() for s in PERMISSION_SLUGS})

    # Load DB overrides for this user
    overrides = {
        row.permission_slug: {
            "can_view": row.can_view,
            "can_create": row.can_create,
            "can_update": row.can_update,
            "can_delete": row.can_delete,
        }
        for row in db.query(UserPermission).filter(UserPermission.user_id == user.id).all()
    }

    result = []
    for slug in PERMISSION_SLUGS:
        base = defaults.get(slug, _ALL_ACTIONS.copy())
        merged = overrides.get(slug, base)
        result.append({"permission_slug": slug, **merged})

    return result


async def get_auth_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> User:
    """
    Dependency to extract and verify the authenticated user.
    Supports both JWT tokens and API keys.

    JWT: Authorization: Bearer <token>
    API Key: Authorization: ApiKey <key>
    """

    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
        )

    parts = authorization.split()

    if len(parts) != 2:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header",
        )

    auth_type, credentials = parts

    if auth_type.lower() == "bearer":
        # JWT token authentication
        user = get_user_from_token(db, credentials)
        return user

    elif auth_type.lower() == "apikey":
        # API key authentication
        user = verify_api_key(db, credentials)
        return user

    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization type",
        )


async def get_auth_user_optional(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Optional authentication dependency. Returns None if not authenticated."""

    if not authorization:
        return None

    try:
        return await get_auth_user(authorization, db)
    except HTTPException:
        return None


async def get_superadmin_user(
    user: User = Depends(get_auth_user),
) -> User:
    """Dependency to ensure user has SUPER_ADMIN role."""

    if user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superadmin access required",
        )

    return user


async def get_franchisee_manager(
    user: User = Depends(get_auth_user),
) -> User:
    """Dependency to ensure user has FRANCHISE_MANAGER or SUPER_ADMIN role."""

    if user.role not in [UserRole.FRANCHISE_MANAGER, UserRole.SUPER_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Franchisee manager access required",
        )

    return user

