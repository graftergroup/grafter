"""Job API routes."""

from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.dependencies import get_auth_user
from backend.models import User, Job, JobStatus
from backend.schemas import JobCreate, JobUpdate, JobResponse

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("", response_model=JobResponse)
async def create_job(
    job_data: JobCreate,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Create a new job."""

    job = Job(
        franchise_id=user.franchise_id,
        booking_id=job_data.booking_id,
        assigned_technician_id=job_data.assigned_technician_id,
        vehicle_id=job_data.vehicle_id,
        scheduled_date=job_data.scheduled_date,
        notes=job_data.notes,
        status=JobStatus.PENDING,
    )

    db.add(job)
    db.commit()
    db.refresh(job)

    return JobResponse.from_orm(job)


@router.get("", response_model=list[JobResponse])
async def list_jobs(
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """List all jobs for the franchise."""

    jobs = (
        db.query(Job)
        .filter(Job.franchise_id == user.franchise_id)
        .all()
    )

    return [JobResponse.from_orm(j) for j in jobs]


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: UUID,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Get a specific job."""

    job = (
        db.query(Job)
        .filter(
            Job.id == job_id,
            Job.franchise_id == user.franchise_id,
        )
        .first()
    )

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    return JobResponse.from_orm(job)


@router.put("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: UUID,
    job_data: JobUpdate,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Update a job."""

    job = (
        db.query(Job)
        .filter(
            Job.id == job_id,
            Job.franchise_id == user.franchise_id,
        )
        .first()
    )

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    # Update fields
    update_data = job_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(job, field, value)

    # If status is marked as completed, set completed_date
    if job_data.status == JobStatus.COMPLETED:
        job.completed_date = datetime.utcnow()

    db.commit()
    db.refresh(job)

    return JobResponse.from_orm(job)


@router.delete("/{job_id}")
async def delete_job(
    job_id: UUID,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Delete a job."""

    job = (
        db.query(Job)
        .filter(
            Job.id == job_id,
            Job.franchise_id == user.franchise_id,
        )
        .first()
    )

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    db.delete(job)
    db.commit()

    return {"status": "deleted"}
