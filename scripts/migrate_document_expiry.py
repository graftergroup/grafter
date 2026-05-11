"""Add expiry_date, file_name, file_size to employee_documents."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from backend.db import SessionLocal

DDL = """
ALTER TABLE employee_documents
    ADD COLUMN IF NOT EXISTS expiry_date     DATE        NULL,
    ADD COLUMN IF NOT EXISTS file_name       TEXT        NULL,
    ADD COLUMN IF NOT EXISTS file_size       BIGINT      NULL;

-- Index for fast expiry lookups (notifications)
CREATE INDEX IF NOT EXISTS idx_employee_documents_expiry
    ON employee_documents (franchise_id, expiry_date)
    WHERE expiry_date IS NOT NULL;
"""

if __name__ == "__main__":
    db = SessionLocal()
    try:
        db.execute(text(DDL))
        db.commit()
        print("Migration applied: expiry_date, file_name, file_size columns added.")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()
