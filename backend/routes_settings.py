"""Platform settings API routes (superadmin only) + franchise self-service settings."""

import smtplib
import ssl
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.dependencies import get_superadmin_user, get_auth_user
from backend.models import User, PlatformSetting, Franchise, UserRole, EmailAccount, EmailPurposeAssignment

router = APIRouter(prefix="/superadmin/settings", tags=["superadmin-settings"])
franchise_settings_router = APIRouter(prefix="/franchise", tags=["franchise-settings"])

# ─── Franchise self-service ───────────────────────────────────────────────────

class FranchiseSelfResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True

class FranchiseSelfUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None

@franchise_settings_router.get("/me", response_model=FranchiseSelfResponse)
async def get_my_franchise(
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Franchise manager reads their own franchise profile."""
    franchise = db.query(Franchise).filter(Franchise.id == user.franchise_id).first()
    if not franchise:
        raise HTTPException(status_code=404, detail="Franchise not found")
    return FranchiseSelfResponse(
        id=str(franchise.id),
        name=franchise.name,
        email=franchise.email,
        phone=franchise.phone,
        address=franchise.address,
        city=franchise.city,
        state=franchise.state,
        postal_code=franchise.postal_code,
        country=franchise.country,
        is_active=franchise.is_active,
    )

@franchise_settings_router.put("/me", response_model=FranchiseSelfResponse)
async def update_my_franchise(
    data: FranchiseSelfUpdate,
    user: User = Depends(get_auth_user),
    db: Session = Depends(get_db),
):
    """Franchise manager updates their own franchise profile."""
    if user.role not in [UserRole.FRANCHISE_MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorised")
    franchise = db.query(Franchise).filter(Franchise.id == user.franchise_id).first()
    if not franchise:
        raise HTTPException(status_code=404, detail="Franchise not found")
    for field, val in data.model_dump(exclude_none=True).items():
        setattr(franchise, field, val)
    franchise.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(franchise)
    return FranchiseSelfResponse(
        id=str(franchise.id),
        name=franchise.name,
        email=franchise.email,
        phone=franchise.phone,
        address=franchise.address,
        city=franchise.city,
        state=franchise.state,
        postal_code=franchise.postal_code,
        country=franchise.country,
        is_active=franchise.is_active,
    )

# ─── Schemas ──────────────────────────────────────────────────────────────────

SMTP_KEYS = ["smtp_host", "smtp_port", "smtp_username", "smtp_password", "smtp_from_email", "smtp_from_name"]

class SettingItem(BaseModel):
    key: str
    value: Optional[str] = None
    is_secret: bool = False
    description: Optional[str] = None

class SmtpConfig(BaseModel):
    smtp_host: str = ""
    smtp_port: str = "587"
    smtp_username: str = ""
    smtp_password: Optional[str] = None   # None = "don't change"
    smtp_from_email: str = ""
    smtp_from_name: str = "Grafter"

class SmtpTestRequest(BaseModel):
    to_email: str

class SmtpConfigResponse(BaseModel):
    smtp_host: str
    smtp_port: str
    smtp_username: str
    smtp_password_set: bool      # whether a password is stored (never return the value)
    smtp_from_email: str
    smtp_from_name: str

# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_setting(db: Session, key: str) -> Optional[str]:
    row = db.query(PlatformSetting).filter(PlatformSetting.key == key).first()
    return row.value if row else None

def _set_setting(db: Session, key: str, value: Optional[str], user_id) -> None:
    row = db.query(PlatformSetting).filter(PlatformSetting.key == key).first()
    if row:
        row.value = value
        row.updated_by = user_id
        row.updated_at = datetime.utcnow()
    else:
        row = PlatformSetting(key=key, value=value, updated_by=user_id)
        db.add(row)

# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("/smtp", response_model=SmtpConfigResponse)
async def get_smtp_config(
    user: User = Depends(get_superadmin_user),
    db: Session = Depends(get_db),
):
    """Return current SMTP configuration (password presence only, not value)."""
    return SmtpConfigResponse(
        smtp_host        = _get_setting(db, "smtp_host") or "",
        smtp_port        = _get_setting(db, "smtp_port") or "587",
        smtp_username    = _get_setting(db, "smtp_username") or "",
        smtp_password_set= bool(_get_setting(db, "smtp_password")),
        smtp_from_email  = _get_setting(db, "smtp_from_email") or "",
        smtp_from_name   = _get_setting(db, "smtp_from_name") or "Grafter",
    )


@router.put("/smtp", response_model=SmtpConfigResponse)
async def update_smtp_config(
    data: SmtpConfig,
    user: User = Depends(get_superadmin_user),
    db: Session = Depends(get_db),
):
    """Save SMTP configuration. Pass smtp_password=null to leave existing password unchanged."""
    _set_setting(db, "smtp_host",       data.smtp_host,       user.id)
    _set_setting(db, "smtp_port",       data.smtp_port,       user.id)
    _set_setting(db, "smtp_username",   data.smtp_username,   user.id)
    _set_setting(db, "smtp_from_email", data.smtp_from_email, user.id)
    _set_setting(db, "smtp_from_name",  data.smtp_from_name,  user.id)
    if data.smtp_password is not None:
        _set_setting(db, "smtp_password", data.smtp_password, user.id)
    db.commit()

    return SmtpConfigResponse(
        smtp_host        = data.smtp_host,
        smtp_port        = data.smtp_port,
        smtp_username    = data.smtp_username,
        smtp_password_set= bool(_get_setting(db, "smtp_password")),
        smtp_from_email  = data.smtp_from_email,
        smtp_from_name   = data.smtp_from_name,
    )


@router.post("/smtp/test")
async def test_smtp(
    data: SmtpTestRequest,
    user: User = Depends(get_superadmin_user),
    db: Session = Depends(get_db),
):
    """
    Attempt a real SMTP connection and send a test email.
    Returns success/error details.
    """
    host     = _get_setting(db, "smtp_host") or ""
    port     = int(_get_setting(db, "smtp_port") or "587")
    username = _get_setting(db, "smtp_username") or ""
    password = _get_setting(db, "smtp_password") or ""
    from_email = _get_setting(db, "smtp_from_email") or username
    from_name  = _get_setting(db, "smtp_from_name") or "Grafter"

    if not host or not username or not password:
        raise HTTPException(status_code=400, detail="SMTP is not fully configured. Please save host, username, and password first.")

    try:
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText

        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Grafter SMTP Test"
        msg["From"]    = f"{from_name} <{from_email}>"
        msg["To"]      = data.to_email
        msg.attach(MIMEText(
            "<p>This is a test email from <strong>Grafter</strong>. Your SMTP configuration is working correctly.</p>",
            "html"
        ))

        context = ssl.create_default_context()
        with smtplib.SMTP(host, port, timeout=10) as server:
            server.ehlo()
            server.starttls(context=context)
            server.login(username, password)
            server.sendmail(from_email, data.to_email, msg.as_string())

        return {"success": True, "message": f"Test email sent to {data.to_email}"}

    except smtplib.SMTPAuthenticationError:
        raise HTTPException(status_code=400, detail="SMTP authentication failed. Check your username and password.")
    except smtplib.SMTPConnectError:
        raise HTTPException(status_code=400, detail=f"Could not connect to {host}:{port}. Check the host and port.")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"SMTP error: {str(exc)}")


# ─── Email Accounts CRUD ──────────────────────────────────────────────────────

class EmailAccountResponse(BaseModel):
    id: str
    name: str
    smtp_host: str
    smtp_port: int
    smtp_username: str
    from_email: str
    from_name: str
    is_active: bool
    password_set: bool

    class Config:
        from_attributes = True

class EmailAccountCreate(BaseModel):
    name: str
    smtp_host: str
    smtp_port: int = 587
    smtp_username: str
    smtp_password: Optional[str] = None
    from_email: str
    from_name: str = "Grafter"
    is_active: bool = True

class EmailAccountUpdate(BaseModel):
    name: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    from_email: Optional[str] = None
    from_name: Optional[str] = None
    is_active: Optional[bool] = None

class EmailAccountTestRequest(BaseModel):
    to_email: str

class PurposeAssignmentResponse(BaseModel):
    purpose: str
    label: str
    description: Optional[str] = None
    account_id: Optional[str] = None
    account_name: Optional[str] = None

class PurposeAssignmentUpdate(BaseModel):
    account_id: Optional[str] = None


def _account_to_response(acc: EmailAccount) -> EmailAccountResponse:
    return EmailAccountResponse(
        id=str(acc.id),
        name=acc.name,
        smtp_host=acc.smtp_host,
        smtp_port=acc.smtp_port,
        smtp_username=acc.smtp_username,
        from_email=acc.from_email,
        from_name=acc.from_name,
        is_active=acc.is_active,
        password_set=bool(acc.smtp_password),
    )


@router.get("/email-accounts", response_model=list[EmailAccountResponse])
async def list_email_accounts(
    user: User = Depends(get_superadmin_user),
    db: Session = Depends(get_db),
):
    accounts = db.query(EmailAccount).order_by(EmailAccount.name).all()
    return [_account_to_response(a) for a in accounts]


@router.post("/email-accounts", response_model=EmailAccountResponse)
async def create_email_account(
    data: EmailAccountCreate,
    user: User = Depends(get_superadmin_user),
    db: Session = Depends(get_db),
):
    acc = EmailAccount(
        name=data.name,
        smtp_host=data.smtp_host,
        smtp_port=data.smtp_port,
        smtp_username=data.smtp_username,
        smtp_password=data.smtp_password,
        from_email=data.from_email,
        from_name=data.from_name,
        is_active=data.is_active,
    )
    db.add(acc)
    db.commit()
    db.refresh(acc)
    return _account_to_response(acc)


@router.put("/email-accounts/{account_id}", response_model=EmailAccountResponse)
async def update_email_account(
    account_id: str,
    data: EmailAccountUpdate,
    user: User = Depends(get_superadmin_user),
    db: Session = Depends(get_db),
):
    acc = db.query(EmailAccount).filter(EmailAccount.id == account_id).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Email account not found")

    if data.name is not None:         acc.name = data.name
    if data.smtp_host is not None:    acc.smtp_host = data.smtp_host
    if data.smtp_port is not None:    acc.smtp_port = data.smtp_port
    if data.smtp_username is not None: acc.smtp_username = data.smtp_username
    if data.smtp_password is not None: acc.smtp_password = data.smtp_password
    if data.from_email is not None:   acc.from_email = data.from_email
    if data.from_name is not None:    acc.from_name = data.from_name
    if data.is_active is not None:    acc.is_active = data.is_active

    db.commit()
    db.refresh(acc)
    return _account_to_response(acc)


@router.delete("/email-accounts/{account_id}")
async def delete_email_account(
    account_id: str,
    user: User = Depends(get_superadmin_user),
    db: Session = Depends(get_db),
):
    acc = db.query(EmailAccount).filter(EmailAccount.id == account_id).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Email account not found")
    db.delete(acc)
    db.commit()
    return {"success": True}


@router.post("/email-accounts/{account_id}/test")
async def test_email_account(
    account_id: str,
    data: EmailAccountTestRequest,
    user: User = Depends(get_superadmin_user),
    db: Session = Depends(get_db),
):
    acc = db.query(EmailAccount).filter(EmailAccount.id == account_id).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Email account not found")

    if not acc.smtp_host or not acc.smtp_username or not acc.smtp_password:
        raise HTTPException(status_code=400, detail="Account is not fully configured (host, username, and password required).")

    try:
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText

        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Grafter Test — {acc.name}"
        msg["From"] = f"{acc.from_name} <{acc.from_email}>"
        msg["To"] = data.to_email
        msg.attach(MIMEText(
            f"<p>Test email from account <strong>{acc.name}</strong> via Grafter. SMTP is configured correctly.</p>",
            "html",
        ))

        context = ssl.create_default_context()
        with smtplib.SMTP(acc.smtp_host, acc.smtp_port, timeout=10) as server:
            server.ehlo()
            server.starttls(context=context)
            server.login(acc.smtp_username, acc.smtp_password)
            server.sendmail(acc.from_email, data.to_email, msg.as_string())

        return {"success": True, "message": f"Test email sent to {data.to_email}"}

    except smtplib.SMTPAuthenticationError:
        raise HTTPException(status_code=400, detail="Authentication failed. Check username/password.")
    except smtplib.SMTPConnectError:
        raise HTTPException(status_code=400, detail=f"Could not connect to {acc.smtp_host}:{acc.smtp_port}.")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"SMTP error: {str(exc)}")


# ─── Purpose Assignments ──────────────────────────────────────────────────────

@router.get("/email-purposes", response_model=list[PurposeAssignmentResponse])
async def list_email_purposes(
    user: User = Depends(get_superadmin_user),
    db: Session = Depends(get_db),
):
    rows = db.query(EmailPurposeAssignment).all()
    result = []
    for row in rows:
        result.append(PurposeAssignmentResponse(
            purpose=row.purpose,
            label=row.label,
            description=row.description,
            account_id=str(row.account_id) if row.account_id else None,
            account_name=row.account.name if row.account else None,
        ))
    return result


@router.put("/email-purposes/{purpose}", response_model=PurposeAssignmentResponse)
async def update_email_purpose(
    purpose: str,
    data: PurposeAssignmentUpdate,
    user: User = Depends(get_superadmin_user),
    db: Session = Depends(get_db),
):
    row = db.query(EmailPurposeAssignment).filter(EmailPurposeAssignment.purpose == purpose).first()
    if not row:
        raise HTTPException(status_code=404, detail="Purpose not found")

    if data.account_id is not None:
        if data.account_id == "":
            row.account_id = None
        else:
            acc = db.query(EmailAccount).filter(EmailAccount.id == data.account_id).first()
            if not acc:
                raise HTTPException(status_code=404, detail="Email account not found")
            row.account_id = acc.id

    db.commit()
    db.refresh(row)
    return PurposeAssignmentResponse(
        purpose=row.purpose,
        label=row.label,
        description=row.description,
        account_id=str(row.account_id) if row.account_id else None,
        account_name=row.account.name if row.account else None,
    )
