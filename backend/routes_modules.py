"""Module management routes — superadmin CRUD + franchise request/approve."""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.dependencies import get_superadmin_user, get_auth_user
from backend.models import User, Module, FranchiseModule, Franchise, UserRole
from backend.schemas import (
    ModuleCreate,
    ModuleUpdate,
    ModuleResponse,
    FranchiseModuleResponse,
    FranchiseModuleApproval,
    FranchiseModuleToggle,
)

# ─── Helpers ──────────────────────────────────────────────────────────────────

def _build_module_response(module: Module, db: Session) -> ModuleResponse:
    active_count = db.query(FranchiseModule).filter(
        FranchiseModule.module_id == module.id,
        FranchiseModule.status == "active",
    ).count()
    pending_count = db.query(FranchiseModule).filter(
        FranchiseModule.module_id == module.id,
        FranchiseModule.status == "pending",
    ).count()
    r = ModuleResponse.from_orm(module)
    r.active_franchise_count = active_count
    r.pending_request_count = pending_count
    return r


def _build_fm_response(fm: FranchiseModule, db: Session) -> FranchiseModuleResponse:
    module = db.query(Module).filter(Module.id == fm.module_id).first()
    franchise = db.query(Franchise).filter(Franchise.id == fm.franchise_id).first()
    effective = fm.custom_price if fm.custom_price is not None else (module.monthly_price if module else 0.0)
    return FranchiseModuleResponse(
        id=fm.id,
        franchise_id=fm.franchise_id,
        franchise_name=franchise.name if franchise else None,
        module_id=fm.module_id,
        module_name=module.name if module else "",
        module_description=module.description if module else None,
        module_slug=module.slug if module else "",
        status=fm.status,
        custom_price=fm.custom_price,
        effective_price=effective,
        requested_at=fm.requested_at,
        activated_at=fm.activated_at,
    )


# ─── Superadmin router ────────────────────────────────────────────────────────

superadmin_router = APIRouter(prefix="/superadmin/modules", tags=["modules-superadmin"])


@superadmin_router.get("", response_model=list[ModuleResponse])
async def list_modules(
    user: User = Depends(get_superadmin_user),
    db: Session = Depends(get_db),
):
    """List all platform modules."""
    modules = db.query(Module).order_by(Module.created_at.desc()).all()
    return [_build_module_response(m, db) for m in modules]


@superadmin_router.post("", response_model=ModuleResponse, status_code=status.HTTP_201_CREATED)
async def create_module(
    body: ModuleCreate,
    user: User = Depends(get_superadmin_user),
    db: Session = Depends(get_db),
):
    """Create a new platform module."""
    existing = db.query(Module).filter(Module.slug == body.slug).first()
    if existing:
        raise HTTPException(status_code=400, detail="Module slug already exists")
    module = Module(
        name=body.name,
        slug=body.slug,
        description=body.description,
        monthly_price=body.monthly_price,
        is_available=body.is_available,
    )
    db.add(module)
    db.commit()
    db.refresh(module)
    return _build_module_response(module, db)


@superadmin_router.put("/{module_id}", response_model=ModuleResponse)
async def update_module(
    module_id: str,
    body: ModuleUpdate,
    user: User = Depends(get_superadmin_user),
    db: Session = Depends(get_db),
):
    """Update a module's details."""
    module = db.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    if body.name is not None:
        module.name = body.name
    if body.description is not None:
        module.description = body.description
    if body.monthly_price is not None:
        module.monthly_price = body.monthly_price
    if body.is_available is not None:
        module.is_available = body.is_available
    db.commit()
    db.refresh(module)
    return _build_module_response(module, db)


@superadmin_router.delete("/{module_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_module(
    module_id: str,
    user: User = Depends(get_superadmin_user),
    db: Session = Depends(get_db),
):
    """Delete a module (cascade-deletes all franchise assignments)."""
    module = db.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    db.delete(module)
    db.commit()


@superadmin_router.get("/requests", response_model=list[FranchiseModuleResponse])
async def list_all_requests(
    user: User = Depends(get_superadmin_user),
    db: Session = Depends(get_db),
):
    """All pending module requests across all franchises."""
    fms = db.query(FranchiseModule).filter(FranchiseModule.status == "pending").all()
    return [_build_fm_response(fm, db) for fm in fms]


# ─── Per-franchise module management (superadmin) ─────────────────────────────

franchise_router = APIRouter(prefix="/superadmin/franchises", tags=["modules-franchise"])


@franchise_router.get("/{franchise_id}/modules", response_model=list[FranchiseModuleResponse])
async def list_franchise_modules(
    franchise_id: str,
    user: User = Depends(get_superadmin_user),
    db: Session = Depends(get_db),
):
    """List all modules and this franchise's status for each."""
    all_modules = db.query(Module).filter(Module.is_available == True).order_by(Module.name).all()
    result = []
    for module in all_modules:
        fm = db.query(FranchiseModule).filter(
            FranchiseModule.franchise_id == franchise_id,
            FranchiseModule.module_id == module.id,
        ).first()
        if not fm:
            # Return a virtual inactive record
            result.append(FranchiseModuleResponse(
                id=module.id,  # use module id as placeholder
                franchise_id=franchise_id,  # type: ignore[arg-type]
                franchise_name=None,
                module_id=module.id,
                module_name=module.name,
                module_description=module.description,
                module_slug=module.slug,
                status="inactive",
                custom_price=None,
                effective_price=module.monthly_price,
                requested_at=None,
                activated_at=None,
            ))
        else:
            result.append(_build_fm_response(fm, db))
    return result


@franchise_router.put("/{franchise_id}/modules/{module_id}", response_model=FranchiseModuleResponse)
async def set_franchise_module(
    franchise_id: str,
    module_id: str,
    body: FranchiseModuleToggle,
    user: User = Depends(get_superadmin_user),
    db: Session = Depends(get_db),
):
    """Superadmin directly activates or deactivates a module for a franchise."""
    module = db.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    fm = db.query(FranchiseModule).filter(
        FranchiseModule.franchise_id == franchise_id,
        FranchiseModule.module_id == module_id,
    ).first()

    if not fm:
        fm = FranchiseModule(franchise_id=franchise_id, module_id=module_id)
        db.add(fm)

    fm.status = body.status
    fm.custom_price = body.custom_price
    if body.status == "active" and not fm.activated_at:
        fm.activated_at = datetime.utcnow()
    elif body.status == "inactive":
        fm.activated_at = None

    db.commit()
    db.refresh(fm)
    return _build_fm_response(fm, db)


@franchise_router.post("/{franchise_id}/modules/{module_id}/approve", response_model=FranchiseModuleResponse)
async def approve_module_request(
    franchise_id: str,
    module_id: str,
    body: FranchiseModuleApproval,
    user: User = Depends(get_superadmin_user),
    db: Session = Depends(get_db),
):
    """Approve or reject a franchise's module request."""
    fm = db.query(FranchiseModule).filter(
        FranchiseModule.franchise_id == franchise_id,
        FranchiseModule.module_id == module_id,
        FranchiseModule.status == "pending",
    ).first()
    if not fm:
        raise HTTPException(status_code=404, detail="Pending request not found")

    fm.status = body.status  # "active" or "rejected"
    if body.custom_price is not None:
        fm.custom_price = body.custom_price
    if body.status == "active":
        fm.activated_at = datetime.utcnow()

    db.commit()
    db.refresh(fm)
    return _build_fm_response(fm, db)


# ─── Franchise-facing router ──────────────────────────────────────────────────

franchise_member_router = APIRouter(prefix="/modules", tags=["modules-franchise-member"])


@franchise_member_router.get("", response_model=list[FranchiseModuleResponse])
async def list_available_modules(
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Franchise member sees all available modules with their current status."""
    if user.role == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Use superadmin endpoint")

    all_modules = db.query(Module).filter(Module.is_available == True).order_by(Module.name).all()
    result = []
    for module in all_modules:
        fm = db.query(FranchiseModule).filter(
            FranchiseModule.franchise_id == user.franchise_id,
            FranchiseModule.module_id == module.id,
        ).first()
        if not fm:
            result.append(FranchiseModuleResponse(
                id=module.id,  # type: ignore[arg-type]
                franchise_id=user.franchise_id,  # type: ignore[arg-type]
                franchise_name=None,
                module_id=module.id,
                module_name=module.name,
                module_description=module.description,
                module_slug=module.slug,
                status="inactive",
                custom_price=None,
                effective_price=module.monthly_price,
                requested_at=None,
                activated_at=None,
            ))
        else:
            result.append(_build_fm_response(fm, db))
    return result


@franchise_member_router.post("/{module_id}/request", response_model=FranchiseModuleResponse)
async def request_module(
    module_id: str,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Franchise member requests access to a module."""
    if user.role == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Use superadmin endpoint")

    module = db.query(Module).filter(Module.id == module_id, Module.is_available == True).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    fm = db.query(FranchiseModule).filter(
        FranchiseModule.franchise_id == user.franchise_id,
        FranchiseModule.module_id == module_id,
    ).first()

    if fm:
        if fm.status == "active":
            raise HTTPException(status_code=400, detail="Module already active")
        if fm.status == "pending":
            raise HTTPException(status_code=400, detail="Request already pending")
        # Re-request if previously rejected
        fm.status = "pending"
        fm.requested_at = datetime.utcnow()
    else:
        fm = FranchiseModule(
            franchise_id=user.franchise_id,
            module_id=module_id,
            status="pending",
            requested_at=datetime.utcnow(),
        )
        db.add(fm)

    db.commit()
    db.refresh(fm)
    return _build_fm_response(fm, db)
