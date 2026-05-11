"""Migration: create email_accounts and email_purpose_assignments tables."""
import os
import psycopg2

DATABASE_URL = os.environ["DB8912C3F9_DATABASE_URL"]

SQL = """
CREATE TABLE IF NOT EXISTS email_accounts (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR(100) NOT NULL,
    smtp_host    VARCHAR(255) NOT NULL DEFAULT '',
    smtp_port    INTEGER NOT NULL DEFAULT 587,
    smtp_username VARCHAR(255) NOT NULL DEFAULT '',
    smtp_password TEXT,
    from_email   VARCHAR(255) NOT NULL DEFAULT '',
    from_name    VARCHAR(100) NOT NULL DEFAULT 'Grafter',
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP DEFAULT NOW(),
    updated_at   TIMESTAMP DEFAULT NOW()
);

-- Defined email purposes — each maps to one account
CREATE TABLE IF NOT EXISTS email_purpose_assignments (
    purpose      VARCHAR(50) PRIMARY KEY,
    label        VARCHAR(100) NOT NULL,
    description  VARCHAR(255),
    account_id   UUID REFERENCES email_accounts(id) ON DELETE SET NULL,
    updated_at   TIMESTAMP DEFAULT NOW()
);

-- Seed the known purposes
INSERT INTO email_purpose_assignments (purpose, label, description) VALUES
  ('staff_invitation',      'Staff Invitations',       'Sent when inviting new staff members to the portal'),
  ('customer_notification', 'Customer Notifications',  'Order confirmations, booking reminders, and updates sent to customers'),
  ('billing',               'Billing & Invoices',      'Invoice delivery, payment receipts, and subscription notifications'),
  ('system_alerts',         'System Alerts',           'Internal platform alerts and error notifications')
ON CONFLICT (purpose) DO NOTHING;
"""

def run():
    conn = psycopg2.connect(DATABASE_URL)
    try:
        with conn.cursor() as cur:
            cur.execute(SQL)
        conn.commit()
        print("✓ email_accounts and email_purpose_assignments tables ready")
    finally:
        conn.close()

if __name__ == "__main__":
    run()
