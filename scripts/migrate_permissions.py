"""Migration: create user_permissions table."""
import os
import psycopg2

DATABASE_URL = os.environ["DB8912C3F9_DATABASE_URL"]

SQL = """
CREATE TABLE IF NOT EXISTS user_permissions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    franchise_id     UUID NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
    permission_slug  VARCHAR(50) NOT NULL,
    can_view         BOOLEAN NOT NULL DEFAULT TRUE,
    can_create       BOOLEAN NOT NULL DEFAULT TRUE,
    can_update       BOOLEAN NOT NULL DEFAULT TRUE,
    can_delete       BOOLEAN NOT NULL DEFAULT TRUE,
    granted_by_id    UUID REFERENCES users(id),
    created_at       TIMESTAMP DEFAULT NOW(),
    updated_at       TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, permission_slug)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id
    ON user_permissions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_permissions_franchise_id
    ON user_permissions(franchise_id);
"""

def run():
    conn = psycopg2.connect(DATABASE_URL)
    try:
        with conn.cursor() as cur:
            cur.execute(SQL)
        conn.commit()
        print("✓ user_permissions table ready")
    finally:
        conn.close()

if __name__ == "__main__":
    run()
