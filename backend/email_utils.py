"""SMTP email utility for sending transactional emails."""

import os
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional


def _get_smtp_config(purpose: Optional[str] = None) -> dict:
    """
    Load SMTP config for a given purpose slug.
    Priority: email_purpose_assignments → email_accounts → platform_settings → env vars.
    Falls back to the global SMTP platform settings if no account is assigned.
    """
    cfg = {
        "host":       os.environ.get("SMTP_HOST", ""),
        "port":       int(os.environ.get("SMTP_PORT", "587")),
        "username":   os.environ.get("SMTP_USERNAME", ""),
        "password":   os.environ.get("SMTP_PASSWORD", ""),
        "from_email": os.environ.get("SMTP_FROM_EMAIL", os.environ.get("SMTP_USERNAME", "")),
        "from_name":  os.environ.get("SMTP_FROM_NAME", "Grafter"),
    }

    try:
        from backend.db import SessionLocal
        from backend.models import PlatformSetting, EmailAccount, EmailPurposeAssignment
        db = SessionLocal()
        try:
            # 1. Try to resolve by purpose slug → linked email account
            if purpose:
                assignment = db.query(EmailPurposeAssignment).filter(
                    EmailPurposeAssignment.purpose == purpose
                ).first()
                if assignment and assignment.account_id:
                    acc = db.query(EmailAccount).filter(
                        EmailAccount.id == assignment.account_id,
                        EmailAccount.is_active == True,
                    ).first()
                    if acc and acc.smtp_host and acc.smtp_username and acc.smtp_password:
                        return {
                            "host":       acc.smtp_host,
                            "port":       acc.smtp_port,
                            "username":   acc.smtp_username,
                            "password":   acc.smtp_password,
                            "from_email": acc.from_email or acc.smtp_username,
                            "from_name":  acc.from_name or "Grafter",
                        }

            # 2. Fall back to legacy global platform_settings SMTP config
            rows = db.query(PlatformSetting).filter(
                PlatformSetting.key.in_([
                    "smtp_host", "smtp_port", "smtp_username",
                    "smtp_password", "smtp_from_email", "smtp_from_name",
                ])
            ).all()
            db_vals = {r.key: r.value for r in rows if r.value}
            if db_vals.get("smtp_host"):       cfg["host"]       = db_vals["smtp_host"]
            if db_vals.get("smtp_port"):       cfg["port"]       = int(db_vals["smtp_port"])
            if db_vals.get("smtp_username"):   cfg["username"]   = db_vals["smtp_username"]
            if db_vals.get("smtp_password"):   cfg["password"]   = db_vals["smtp_password"]
            if db_vals.get("smtp_from_email"): cfg["from_email"] = db_vals["smtp_from_email"]
            if db_vals.get("smtp_from_name"):  cfg["from_name"]  = db_vals["smtp_from_name"]
        finally:
            db.close()
    except Exception as e:
        print(f"[email] Could not load SMTP config from DB: {e}")

    return cfg


def send_email(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: Optional[str] = None,
    purpose: Optional[str] = None,
) -> bool:
    """
    Send a transactional email via SMTP.
    Returns True on success, False on failure (logs error, never raises).
    If purpose is provided, the matching email account is used.
    """
    cfg = _get_smtp_config(purpose=purpose)
    if not cfg["host"] or not cfg["username"] or not cfg["password"]:
        print(f"[email] SMTP not configured — skipping send to {to_email}")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"{cfg['from_name']} <{cfg['from_email']}>"
        msg["To"]      = to_email

        if text_body:
            msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        context = ssl.create_default_context()
        with smtplib.SMTP(cfg["host"], cfg["port"]) as server:
            server.ehlo()
            server.starttls(context=context)
            server.login(cfg["username"], cfg["password"])
            server.sendmail(cfg["from_email"], to_email, msg.as_string())

        print(f"[email] Sent '{subject}' to {to_email}")
        return True

    except Exception as exc:
        print(f"[email] Failed to send to {to_email}: {exc}")
        return False


# ─── Email templates ──────────────────────────────────────────────────────────

def send_staff_invite(
    to_email: str,
    first_name: str,
    invite_url: str,
    franchise_name: str,
    expires_hours: int = 72,
) -> bool:
    """Send a staff invitation email with the accept link."""

    subject = f"You've been invited to join {franchise_name} on Grafter"

    html = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#161b26;padding:28px 36px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:8px;width:36px;height:36px;text-align:center;vertical-align:middle;">
                    <span style="color:#161b26;font-size:16px;font-weight:700;line-height:36px;">G</span>
                  </td>
                  <td style="padding-left:12px;vertical-align:middle;">
                    <span style="color:#ffffff;font-size:18px;font-weight:600;letter-spacing:-0.02em;">Grafter</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px;">
              <p style="margin:0 0 8px;font-size:24px;font-weight:700;color:#111827;letter-spacing:-0.02em;">
                Hi {first_name},
              </p>
              <p style="margin:0 0 24px;font-size:16px;color:#6b7280;line-height:1.6;">
                You've been invited to join <strong style="color:#111827;">{franchise_name}</strong> as a staff member on the Grafter platform.
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                Click the button below to set your password and activate your account. This link expires in <strong>{expires_hours} hours</strong>.
              </p>
              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="background:#f59e0b;border-radius:8px;">
                    <a href="{invite_url}"
                       style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#161b26;text-decoration:none;border-radius:8px;">
                      Accept Invitation →
                    </a>
                  </td>
                </tr>
              </table>
              <!-- Fallback link -->
              <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;">
                Or copy this link into your browser:
              </p>
              <p style="margin:0;font-size:12px;color:#6b7280;word-break:break-all;background:#f9fafb;padding:10px 12px;border-radius:6px;border:1px solid #e5e7eb;">
                {invite_url}
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 36px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                This invitation was sent by {franchise_name} via Grafter. If you weren't expecting this, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    text = f"""Hi {first_name},

You've been invited to join {franchise_name} as a staff member on Grafter.

Accept your invitation here:
{invite_url}

This link expires in {expires_hours} hours.

If you weren't expecting this invitation, you can safely ignore this email.
"""

    return send_email(to_email, subject, html, text, purpose="staff_invitation")
