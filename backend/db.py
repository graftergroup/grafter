"""Database connection and session management."""

import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

from backend.config import get_settings

settings = get_settings()

# Create database engine with connection pooling
engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,  # Verify connections before using them
    pool_size=10,
    max_overflow=20,
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative base for ORM models
Base = declarative_base()


def get_db() -> Session:
    """Dependency injection for database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_all_tables():
    """Create all database tables."""
    Base.metadata.create_all(bind=engine)


def drop_all_tables():
    """Drop all database tables (use with caution)."""
    Base.metadata.drop_all(bind=engine)


def init_superadmin():
    """Initialize superadmin user if INIT_SUPERADMIN env var is set."""
    from backend.models import User, UserRole, Franchise
    from backend.auth import hash_password
    
    superadmin_email = os.environ.get("SUPERADMIN_EMAIL")
    superadmin_password = os.environ.get("SUPERADMIN_PASSWORD")
    
    if not superadmin_email or not superadmin_password:
        return
    
    db = SessionLocal()
    try:
        # Check if superadmin already exists
        existing = db.query(User).filter(User.email == superadmin_email).first()
        if existing:
            return
        
        # Create superadmin franchise
        superadmin_franchise = Franchise(
            name="Platform Admin",
            slug="platform-admin",
            email=superadmin_email,
            is_active=True,
            approval_status="approved",
            subscription_status="active",
        )
        db.add(superadmin_franchise)
        db.flush()
        
        # Create superadmin user
        superadmin = User(
            email=superadmin_email,
            password_hash=hash_password(superadmin_password),
            first_name="Super",
            last_name="Admin",
            role=UserRole.SUPER_ADMIN,
            franchise_id=superadmin_franchise.id,
            is_active=True,
        )
        db.add(superadmin)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error initializing superadmin: {e}")
    finally:
        db.close()

