"""Authentication middleware and dependencies."""

from typing import Optional
from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.auth import verify_token, verify_api_key, get_user_from_token
from backend.models import User


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
