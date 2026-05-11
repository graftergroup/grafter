"""Migration: create platform_settings table."""
import os
import psycopg2

DATABASE_URL = os.environ["DB8912C3F9_DATABASE_URL"]

SQL = """
CREATE TABLE IF NOT EXISTS platform_settings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key         VARCHAR(100) NOT NULL UNIQUE,
    value       TEXT,
    is_secret   BOOLEAN NOT NULL DEFAULT FALSE,
    description VARCHAR(255),
    updated_by  UUID REFERENCES users(id),
    updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_settings_key ON platform_settings(key);

-- Seed default SMTP keys (no values yet)
INSERT INTO platform_settings (key, is_secret, description) VALUES
  ('smtp_host',       FALSE, 'SMTP server hostname'),
  ('smtp_port',       FALSE, 'SMTP server port (default 587)'),
  ('smtp_username',   FALSE, 'SMTP username / login email'),
  ('smtp_password',   TRUE,  'SMTP password or app password'),
  ('smtp_from_email', FALSE, 'Sender email address'),
  ('smtp_from_name',  FALSE, 'Sender display name')
ON CONFLICT (key) DO NOTHING;
"""

def run():
    conn = psycopg2.connect(DATABASE_URL)
    try:
        with conn.cursor() as cur:
            cur.execute(SQL)
        conn.commit()
        print("✓ platform_settings table ready")
    finally:
        conn.close()

if __name__ == "__main__":
    run()
