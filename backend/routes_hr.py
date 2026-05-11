"""HR module API routes — all scoped to the authenticated user's franchise."""

import os
import shutil
import uuid
from datetime import datetime, timedelta
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy import and_
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.dependencies import get_auth_user
from backend.models import (
    User, UserRole,
    LeaveRequest, Shift, EmployeeDocument, PerformanceReview, ExpenseClaim, JobPosting,
)

hr_router = APIRouter(prefix="/hr", tags=["hr"])


# ─── Helpers ─────────────────────────────────────────────────────────────────

def require_franchise_staff(user: User) -> None:
    """Raise 403 if user has no franchise scope."""
    if user.role == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="HR routes are franchise-scoped")


def _user_name(u: Optional[User]) -> Optional[str]:
    if not u:
        return None
    return f"{u.first_name} {u.last_name}"


# ─── Employees ───────────────────────────────────────────────────────────────

@hr_router.get("/employees")
async def list_employees(
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """List all staff for the franchise."""
    staff = (
        db.query(User)
        .filter(
            User.franchise_id == user.franchise_id,
            User.role != UserRole.CUSTOMER,
        )
        .order_by(User.first_name)
        .all()
    )
    return [
        {
            "id": str(s.id),
            "first_name": s.first_name,
            "last_name": s.last_name,
            "email": s.email,
            "role": s.role.value if s.role else "unknown",
            "staff_type": s.staff_type,
            "is_active": s.is_active,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in staff
    ]


@hr_router.get("/employees/{employee_id}")
async def get_employee(
    employee_id: str,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    emp = db.query(User).filter(
        User.id == employee_id,
        User.franchise_id == user.franchise_id,
    ).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    leave = db.query(LeaveRequest).filter(LeaveRequest.employee_id == employee_id).order_by(LeaveRequest.start_date.desc()).all()
    shifts = db.query(Shift).filter(Shift.employee_id == employee_id).order_by(Shift.shift_date.desc()).limit(20).all()
    docs = db.query(EmployeeDocument).filter(EmployeeDocument.employee_id == employee_id).order_by(EmployeeDocument.created_at.desc()).all()
    reviews = db.query(PerformanceReview).filter(PerformanceReview.employee_id == employee_id).order_by(PerformanceReview.review_date.desc()).all()
    expenses = db.query(ExpenseClaim).filter(ExpenseClaim.employee_id == employee_id).order_by(ExpenseClaim.expense_date.desc()).all()

    return {
        "id": str(emp.id),
        "first_name": emp.first_name,
        "last_name": emp.last_name,
        "email": emp.email,
        "phone": emp.phone,
        "role": emp.role.value if emp.role else "unknown",
        "staff_type": emp.staff_type,
        "is_active": emp.is_active,
        "created_at": emp.created_at.isoformat() if emp.created_at else None,
        "leave": [_leave_dict(l) for l in leave],
        "shifts": [_shift_dict(s) for s in shifts],
        "documents": [_doc_dict(d) for d in docs],
        "reviews": [_review_dict(r) for r in reviews],
        "expenses": [_expense_dict(e) for e in expenses],
    }


# ─── Leave ───────────────────────────────────────────────────────────────────

class LeaveCreate(BaseModel):
    employee_id: str
    leave_type: str = "annual"
    start_date: str
    end_date: str
    days: float = 1.0
    reason: Optional[str] = None


class LeaveUpdate(BaseModel):
    status: Optional[str] = None
    reason: Optional[str] = None


def _leave_dict(l: LeaveRequest) -> dict:
    return {
        "id": str(l.id),
        "employee_id": str(l.employee_id),
        "employee_name": _user_name(l.employee),
        "leave_type": l.leave_type,
        "start_date": l.start_date.isoformat() if l.start_date else None,
        "end_date": l.end_date.isoformat() if l.end_date else None,
        "days": l.days,
        "reason": l.reason,
        "status": l.status,
        "reviewed_by": _user_name(l.reviewed_by),
        "reviewed_at": l.reviewed_at.isoformat() if l.reviewed_at else None,
        "created_at": l.created_at.isoformat() if l.created_at else None,
    }


@hr_router.get("/leave")
async def list_leave(
    employee_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    q = db.query(LeaveRequest).filter(LeaveRequest.franchise_id == user.franchise_id)
    if employee_id:
        q = q.filter(LeaveRequest.employee_id == employee_id)
    if status:
        q = q.filter(LeaveRequest.status == status)
    return [_leave_dict(l) for l in q.order_by(LeaveRequest.start_date.desc()).all()]


@hr_router.post("/leave")
async def create_leave(
    data: LeaveCreate,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    lr = LeaveRequest(
        franchise_id=user.franchise_id,
        employee_id=data.employee_id,
        leave_type=data.leave_type,
        start_date=datetime.fromisoformat(data.start_date),
        end_date=datetime.fromisoformat(data.end_date),
        days=data.days,
        reason=data.reason,
        status="pending",
    )
    db.add(lr)
    db.commit()
    db.refresh(lr)
    return _leave_dict(lr)


@hr_router.put("/leave/{leave_id}")
async def update_leave(
    leave_id: str,
    data: LeaveUpdate,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    lr = db.query(LeaveRequest).filter(
        LeaveRequest.id == leave_id,
        LeaveRequest.franchise_id == user.franchise_id,
    ).first()
    if not lr:
        raise HTTPException(status_code=404, detail="Leave request not found")
    if data.status:
        lr.status = data.status
        lr.reviewed_by_id = user.id
        lr.reviewed_at = datetime.utcnow()
    if data.reason is not None:
        lr.reason = data.reason
    lr.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(lr)
    return _leave_dict(lr)


# ─── Shifts ──────────────────────────────────────────────────────────────────

class ShiftCreate(BaseModel):
    employee_id: str
    shift_date: str
    start_time: str
    end_time: str
    role: Optional[str] = None
    notes: Optional[str] = None


class ShiftUpdate(BaseModel):
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    role: Optional[str] = None
    notes: Optional[str] = None


def _shift_dict(s: Shift) -> dict:
    return {
        "id": str(s.id),
        "employee_id": str(s.employee_id),
        "employee_name": _user_name(s.employee),
        "shift_date": s.shift_date.isoformat() if s.shift_date else None,
        "start_time": s.start_time,
        "end_time": s.end_time,
        "role": s.role,
        "notes": s.notes,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


@hr_router.get("/shifts")
async def list_shifts(
    employee_id: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    q = db.query(Shift).filter(Shift.franchise_id == user.franchise_id)
    if employee_id:
        q = q.filter(Shift.employee_id == employee_id)
    if date_from:
        q = q.filter(Shift.shift_date >= datetime.fromisoformat(date_from))
    if date_to:
        q = q.filter(Shift.shift_date <= datetime.fromisoformat(date_to))
    return [_shift_dict(s) for s in q.order_by(Shift.shift_date).all()]


@hr_router.post("/shifts")
async def create_shift(
    data: ShiftCreate,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    s = Shift(
        franchise_id=user.franchise_id,
        employee_id=data.employee_id,
        shift_date=datetime.fromisoformat(data.shift_date),
        start_time=data.start_time,
        end_time=data.end_time,
        role=data.role,
        notes=data.notes,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return _shift_dict(s)


@hr_router.put("/shifts/{shift_id}")
async def update_shift(
    shift_id: str,
    data: ShiftUpdate,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    s = db.query(Shift).filter(
        Shift.id == shift_id,
        Shift.franchise_id == user.franchise_id,
    ).first()
    if not s:
        raise HTTPException(status_code=404, detail="Shift not found")
    if data.start_time is not None: s.start_time = data.start_time
    if data.end_time is not None: s.end_time = data.end_time
    if data.role is not None: s.role = data.role
    if data.notes is not None: s.notes = data.notes
    s.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(s)
    return _shift_dict(s)


@hr_router.delete("/shifts/{shift_id}")
async def delete_shift(
    shift_id: str,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    s = db.query(Shift).filter(
        Shift.id == shift_id,
        Shift.franchise_id == user.franchise_id,
    ).first()
    if not s:
        raise HTTPException(status_code=404, detail="Shift not found")
    db.delete(s)
    db.commit()
    return {"status": "deleted"}


# ─── Documents ───────────────────────────────────────────────────────────────

UPLOAD_DIR = "/tmp/grafter_uploads"

class DocumentCreate(BaseModel):
    employee_id: str
    title: str
    doc_type: str = "other"
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    expiry_date: Optional[str] = None   # ISO date string YYYY-MM-DD
    notes: Optional[str] = None


def _doc_dict(d: EmployeeDocument) -> dict:
    # Days until expiry
    days_until_expiry = None
    expiry_status = None
    if d.expiry_date:
        delta = (d.expiry_date.date() - datetime.utcnow().date()).days
        days_until_expiry = delta
        if delta < 0:
            expiry_status = "expired"
        elif delta <= 30:
            expiry_status = "critical"
        elif delta <= 90:
            expiry_status = "warning"
        else:
            expiry_status = "ok"

    return {
        "id": str(d.id),
        "employee_id": str(d.employee_id),
        "employee_name": _user_name(d.employee),
        "title": d.title,
        "doc_type": d.doc_type,
        "file_url": d.file_url,
        "file_name": d.file_name,
        "file_size": d.file_size,
        "expiry_date": d.expiry_date.isoformat()[:10] if d.expiry_date else None,
        "days_until_expiry": days_until_expiry,
        "expiry_status": expiry_status,
        "notes": d.notes,
        "uploaded_by": _user_name(d.uploaded_by),
        "created_at": d.created_at.isoformat() if d.created_at else None,
    }


@hr_router.get("/documents")
async def list_documents(
    employee_id: Optional[str] = Query(None),
    doc_type: Optional[str] = Query(None),
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    q = db.query(EmployeeDocument).filter(EmployeeDocument.franchise_id == user.franchise_id)
    if employee_id:
        q = q.filter(EmployeeDocument.employee_id == employee_id)
    if doc_type:
        q = q.filter(EmployeeDocument.doc_type == doc_type)
    return [_doc_dict(d) for d in q.order_by(EmployeeDocument.created_at.desc()).all()]


@hr_router.post("/documents")
async def create_document(
    data: DocumentCreate,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    expiry = None
    if data.expiry_date:
        try:
            expiry = datetime.strptime(data.expiry_date, "%Y-%m-%d")
        except ValueError:
            pass

    d = EmployeeDocument(
        franchise_id=user.franchise_id,
        employee_id=data.employee_id,
        title=data.title,
        doc_type=data.doc_type,
        file_url=data.file_url,
        file_name=data.file_name,
        file_size=data.file_size,
        expiry_date=expiry,
        notes=data.notes,
        uploaded_by_id=user.id,
    )
    db.add(d)
    db.commit()
    db.refresh(d)
    return _doc_dict(d)


@hr_router.post("/documents/upload")
async def upload_document(
    employee_id: str = Form(...),
    title: str = Form(...),
    doc_type: str = Form("other"),
    expiry_date: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    file: UploadFile = File(...),
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Upload a file and create a document record. File stored on local disk."""
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    ext = os.path.splitext(file.filename or "")[1].lower()
    stored_name = f"{uuid.uuid4().hex}{ext}"
    dest_path = os.path.join(UPLOAD_DIR, stored_name)

    with open(dest_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    file_size = os.path.getsize(dest_path)
    # Serve back via /api/hr/documents/file/<stored_name>
    file_url = f"/api/hr/documents/file/{stored_name}"

    expiry = None
    if expiry_date:
        try:
            expiry = datetime.strptime(expiry_date, "%Y-%m-%d")
        except ValueError:
            pass

    d = EmployeeDocument(
        franchise_id=user.franchise_id,
        employee_id=employee_id,
        title=title,
        doc_type=doc_type,
        file_url=file_url,
        file_name=file.filename,
        file_size=file_size,
        expiry_date=expiry,
        notes=notes,
        uploaded_by_id=user.id,
    )
    db.add(d)
    db.commit()
    db.refresh(d)
    return _doc_dict(d)


@hr_router.get("/documents/file/{filename}")
async def serve_document(filename: str, user: User = Depends(get_auth_user)):
    """Serve a previously uploaded document file."""
    from fastapi.responses import FileResponse
    path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(path) or ".." in filename:
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path)


@hr_router.get("/documents/expiring")
async def expiring_documents(
    days: int = Query(90, description="Look-ahead window in days"),
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Return documents expiring within `days` days (including already expired)."""
    cutoff = datetime.utcnow() + timedelta(days=days)
    docs = (
        db.query(EmployeeDocument)
        .filter(
            EmployeeDocument.franchise_id == user.franchise_id,
            EmployeeDocument.expiry_date.isnot(None),
            EmployeeDocument.expiry_date <= cutoff,
        )
        .order_by(EmployeeDocument.expiry_date.asc())
        .all()
    )
    return [_doc_dict(d) for d in docs]


@hr_router.delete("/documents/{doc_id}")
async def delete_document(
    doc_id: str,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    d = db.query(EmployeeDocument).filter(
        EmployeeDocument.id == doc_id,
        EmployeeDocument.franchise_id == user.franchise_id,
    ).first()
    if not d:
        raise HTTPException(status_code=404, detail="Document not found")
    # Remove file if stored locally
    if d.file_url and d.file_url.startswith("/api/hr/documents/file/"):
        fname = d.file_url.split("/")[-1]
        path = os.path.join(UPLOAD_DIR, fname)
        if os.path.exists(path):
            os.remove(path)
    db.delete(d)
    db.commit()
    return {"status": "deleted"}


# ─── Performance Reviews ──────────────────────────────────────────────────────

class ReviewCreate(BaseModel):
    employee_id: str
    period: str
    review_date: Optional[str] = None
    overall_rating: int = 3
    goals: Optional[str] = None
    strengths: Optional[str] = None
    improvements: Optional[str] = None
    notes: Optional[str] = None
    status: str = "draft"


class ReviewUpdate(BaseModel):
    period: Optional[str] = None
    overall_rating: Optional[int] = None
    goals: Optional[str] = None
    strengths: Optional[str] = None
    improvements: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


def _review_dict(r: PerformanceReview) -> dict:
    return {
        "id": str(r.id),
        "employee_id": str(r.employee_id),
        "employee_name": _user_name(r.employee),
        "reviewer_id": str(r.reviewer_id),
        "reviewer_name": _user_name(r.reviewer),
        "period": r.period,
        "review_date": r.review_date.isoformat() if r.review_date else None,
        "overall_rating": r.overall_rating,
        "goals": r.goals,
        "strengths": r.strengths,
        "improvements": r.improvements,
        "notes": r.notes,
        "status": r.status,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


@hr_router.get("/performance")
async def list_reviews(
    employee_id: Optional[str] = Query(None),
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    q = db.query(PerformanceReview).filter(PerformanceReview.franchise_id == user.franchise_id)
    if employee_id:
        q = q.filter(PerformanceReview.employee_id == employee_id)
    return [_review_dict(r) for r in q.order_by(PerformanceReview.review_date.desc()).all()]


@hr_router.post("/performance")
async def create_review(
    data: ReviewCreate,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    r = PerformanceReview(
        franchise_id=user.franchise_id,
        employee_id=data.employee_id,
        reviewer_id=user.id,
        period=data.period,
        review_date=datetime.fromisoformat(data.review_date) if data.review_date else datetime.utcnow(),
        overall_rating=data.overall_rating,
        goals=data.goals,
        strengths=data.strengths,
        improvements=data.improvements,
        notes=data.notes,
        status=data.status,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return _review_dict(r)


@hr_router.put("/performance/{review_id}")
async def update_review(
    review_id: str,
    data: ReviewUpdate,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    r = db.query(PerformanceReview).filter(
        PerformanceReview.id == review_id,
        PerformanceReview.franchise_id == user.franchise_id,
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail="Review not found")
    if data.period is not None: r.period = data.period
    if data.overall_rating is not None: r.overall_rating = data.overall_rating
    if data.goals is not None: r.goals = data.goals
    if data.strengths is not None: r.strengths = data.strengths
    if data.improvements is not None: r.improvements = data.improvements
    if data.notes is not None: r.notes = data.notes
    if data.status is not None: r.status = data.status
    r.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(r)
    return _review_dict(r)


# ─── Expenses ────────────────────────────────────────────────────────────────

class ExpenseCreate(BaseModel):
    employee_id: str
    description: str
    amount: float
    category: str = "other"
    expense_date: str
    receipt_url: Optional[str] = None
    notes: Optional[str] = None


class ExpenseUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


def _expense_dict(e: ExpenseClaim) -> dict:
    return {
        "id": str(e.id),
        "employee_id": str(e.employee_id),
        "employee_name": _user_name(e.employee),
        "description": e.description,
        "amount": e.amount,
        "category": e.category,
        "expense_date": e.expense_date.isoformat() if e.expense_date else None,
        "receipt_url": e.receipt_url,
        "status": e.status,
        "reviewed_by": _user_name(e.reviewed_by),
        "reviewed_at": e.reviewed_at.isoformat() if e.reviewed_at else None,
        "notes": e.notes,
        "created_at": e.created_at.isoformat() if e.created_at else None,
    }


@hr_router.get("/expenses")
async def list_expenses(
    employee_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    q = db.query(ExpenseClaim).filter(ExpenseClaim.franchise_id == user.franchise_id)
    if employee_id:
        q = q.filter(ExpenseClaim.employee_id == employee_id)
    if status:
        q = q.filter(ExpenseClaim.status == status)
    return [_expense_dict(e) for e in q.order_by(ExpenseClaim.expense_date.desc()).all()]


@hr_router.post("/expenses")
async def create_expense(
    data: ExpenseCreate,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    e = ExpenseClaim(
        franchise_id=user.franchise_id,
        employee_id=data.employee_id,
        description=data.description,
        amount=data.amount,
        category=data.category,
        expense_date=datetime.fromisoformat(data.expense_date),
        receipt_url=data.receipt_url,
        notes=data.notes,
        status="pending",
    )
    db.add(e)
    db.commit()
    db.refresh(e)
    return _expense_dict(e)


@hr_router.put("/expenses/{expense_id}")
async def update_expense(
    expense_id: str,
    data: ExpenseUpdate,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    e = db.query(ExpenseClaim).filter(
        ExpenseClaim.id == expense_id,
        ExpenseClaim.franchise_id == user.franchise_id,
    ).first()
    if not e:
        raise HTTPException(status_code=404, detail="Expense not found")
    if data.status:
        e.status = data.status
        e.reviewed_by_id = user.id
        e.reviewed_at = datetime.utcnow()
    if data.notes is not None:
        e.notes = data.notes
    e.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(e)
    return _expense_dict(e)


# ─── Recruitment ─────────────────────────────────────────────────────────────

class PostingCreate(BaseModel):
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    employment_type: str = "full_time"
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    requirements: Optional[str] = None
    status: str = "draft"
    closes_at: Optional[str] = None


class PostingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    requirements: Optional[str] = None
    status: Optional[str] = None
    closes_at: Optional[str] = None


def _posting_dict(p: JobPosting) -> dict:
    return {
        "id": str(p.id),
        "title": p.title,
        "description": p.description,
        "location": p.location,
        "employment_type": p.employment_type,
        "salary_min": p.salary_min,
        "salary_max": p.salary_max,
        "requirements": p.requirements,
        "status": p.status,
        "posted_at": p.posted_at.isoformat() if p.posted_at else None,
        "closes_at": p.closes_at.isoformat() if p.closes_at else None,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


@hr_router.get("/recruitment")
async def list_postings(
    status: Optional[str] = Query(None),
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    q = db.query(JobPosting).filter(JobPosting.franchise_id == user.franchise_id)
    if status:
        q = q.filter(JobPosting.status == status)
    return [_posting_dict(p) for p in q.order_by(JobPosting.created_at.desc()).all()]


@hr_router.post("/recruitment")
async def create_posting(
    data: PostingCreate,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    p = JobPosting(
        franchise_id=user.franchise_id,
        title=data.title,
        description=data.description,
        location=data.location,
        employment_type=data.employment_type,
        salary_min=data.salary_min,
        salary_max=data.salary_max,
        requirements=data.requirements,
        status=data.status,
        posted_at=datetime.utcnow() if data.status == "open" else None,
        closes_at=datetime.fromisoformat(data.closes_at) if data.closes_at else None,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return _posting_dict(p)


@hr_router.put("/recruitment/{posting_id}")
async def update_posting(
    posting_id: str,
    data: PostingUpdate,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    p = db.query(JobPosting).filter(
        JobPosting.id == posting_id,
        JobPosting.franchise_id == user.franchise_id,
    ).first()
    if not p:
        raise HTTPException(status_code=404, detail="Job posting not found")
    if data.title is not None: p.title = data.title
    if data.description is not None: p.description = data.description
    if data.location is not None: p.location = data.location
    if data.employment_type is not None: p.employment_type = data.employment_type
    if data.salary_min is not None: p.salary_min = data.salary_min
    if data.salary_max is not None: p.salary_max = data.salary_max
    if data.requirements is not None: p.requirements = data.requirements
    if data.closes_at is not None: p.closes_at = datetime.fromisoformat(data.closes_at)
    if data.status is not None:
        if data.status == "open" and p.status != "open":
            p.posted_at = datetime.utcnow()
        p.status = data.status
    p.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(p)
    return _posting_dict(p)


@hr_router.delete("/recruitment/{posting_id}")
async def delete_posting(
    posting_id: str,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    p = db.query(JobPosting).filter(
        JobPosting.id == posting_id,
        JobPosting.franchise_id == user.franchise_id,
    ).first()
    if not p:
        raise HTTPException(status_code=404, detail="Job posting not found")
    db.delete(p)
    db.commit()
    return {"status": "deleted"}
