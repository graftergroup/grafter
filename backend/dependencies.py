"""Authentication middleware and dependencies."""

from typing import Optional
from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.auth import verify_token, verify_api_key, get_user_from_token
from backend.models import User, UserRole


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

