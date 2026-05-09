"""Authentication API routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    verify_token,
    create_api_key,
)
from backend.dependencies import get_auth_user
from backend.models import User, Franchise, UserRole
from backend.schemas import (
    UserCreate,
    LoginRequest,
    LoginResponse,
    UserResponse,
    RefreshTokenRequest,
    APIKeyCreate,
    APIKeyResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=LoginResponse)
async def register(
    user_data: UserCreate,
    db: Session = Depends(get_db),
):
    """Register a new user."""

    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email already exists",
        )

    # Determine franchise_id
    if user_data.franchise_id:
        # Creating user with specified franchise
        franchise_id = user_data.franchise_id
    else:
        # Auto-create a franchise for this user (first-time setup)
        franchise = Franchise(
            name=f"{user_data.first_name} {user_data.last_name}'s Franchise",
            slug=user_data.email.split("@")[0].lower(),
            email=user_data.email,
        )
        db.add(franchise)
        db.commit()
        db.refresh(franchise)
        franchise_id = franchise.id

    # Create new user
    user = User(
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        phone=user_data.phone,
        role=UserRole.FRANCHISE_MANAGER if not user_data.franchise_id else user_data.role,
        franchise_id=franchise_id,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    # Generate tokens
    access_token = create_access_token(str(user.id), str(user.franchise_id), user.role)
    refresh_token = create_refresh_token(str(user.id), str(user.franchise_id))

    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.from_orm(user),
    )


@router.post("/login", response_model=LoginResponse)
async def login(
    credentials: LoginRequest,
    db: Session = Depends(get_db),
):
    """Login with email and password."""

    user = db.query(User).filter(User.email == credentials.email).first()

    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    # Generate tokens
    access_token = create_access_token(str(user.id), str(user.franchise_id), user.role)
    refresh_token = create_refresh_token(str(user.id), str(user.franchise_id))

    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.from_orm(user),
    )


@router.post("/refresh", response_model=dict)
async def refresh(
    request: RefreshTokenRequest,
    db: Session = Depends(get_db),
):
    """Refresh access token using refresh token."""

    payload = verify_token(request.refresh_token)

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user_id = payload.get("user_id")
    franchise_id = payload.get("franchise_id")

    user = db.query(User).filter(User.id == user_id).first()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    access_token = create_access_token(user_id, franchise_id, user.role)

    return {"access_token": access_token}


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    user: User = Depends(get_auth_user),
):
    """Get current authenticated user."""

    return UserResponse.from_orm(user)


@router.post("/api-keys", response_model=APIKeyResponse)
async def create_api_key_route(
    key_data: APIKeyCreate,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Create a new API key for the current user."""

    key = create_api_key(db, str(user.id), key_data.name)

    # Fetch the created API key from database
    api_key = db.query(APIKey).filter(APIKey.key == key).first()

    return APIKeyResponse.from_orm(api_key)


@router.get("/api-keys", response_model=list[APIKeyResponse])
async def list_api_keys(
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """List all API keys for the current user."""

    from backend.models import APIKey

    api_keys = db.query(APIKey).filter(APIKey.user_id == user.id).all()

    return [APIKeyResponse.from_orm(key) for key in api_keys]


@router.delete("/api-keys/{api_key_id}")
async def delete_api_key(
    api_key_id: str,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Delete an API key."""

    from backend.models import APIKey

    api_key = (
        db.query(APIKey)
        .filter(APIKey.id == api_key_id, APIKey.user_id == user.id)
        .first()
    )

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found",
        )

    db.delete(api_key)
    db.commit()

    return {"status": "deleted"}
