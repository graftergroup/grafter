"""Authentication and authorization system."""

from datetime import datetime, timedelta
from typing import Optional
import uuid
import secrets

import jwt
import bcrypt
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.config import get_settings
from backend.models import User, APIKey, UserRole

settings = get_settings()


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode(), salt).decode()


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its hash."""
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def create_access_token(user_id: str, franchise_id: str, role: UserRole, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    if expires_delta is None:
        expires_delta = settings.JWT_EXPIRATION_DELTA

    to_encode = {
        "user_id": user_id,
        "franchise_id": franchise_id,
        "role": role.value,
        "exp": datetime.utcnow() + expires_delta,
    }

    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def create_refresh_token(user_id: str, franchise_id: str) -> str:
    """Create a JWT refresh token."""
    to_encode = {
        "user_id": user_id,
        "franchise_id": franchise_id,
        "type": "refresh",
        "exp": datetime.utcnow() + settings.JWT_REFRESH_EXPIRATION_DELTA,
    }

    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> dict:
    """Verify and decode a JWT token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )


def create_api_key(db: Session, user_id: str, name: str) -> str:
    """Create a new API key for a user."""
    # Generate a secure random key
    key = f"gfr_{secrets.token_urlsafe(32)}"

    api_key = APIKey(
        user_id=uuid.UUID(user_id),
        key=key,
        name=name,
    )

    db.add(api_key)
    db.commit()
    db.refresh(api_key)

    return key


def verify_api_key(db: Session, key: str) -> User:
    """Verify an API key and return the associated user."""
    api_key = db.query(APIKey).filter(APIKey.key == key, APIKey.is_active == True).first()

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )

    # Update last_used_at
    api_key.last_used_at = datetime.utcnow()
    db.commit()

    return api_key.user


def get_user_from_token(db: Session, token: str) -> User:
    """Extract user from JWT token."""
    payload = verify_token(token)
    user_id = payload.get("user_id")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user
