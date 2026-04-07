"""Migration: Add is_admin column to organizers table."""
import os
from dotenv import load_dotenv

load_dotenv()

from app import create_app
from models import db

app = create_app()

MIGRATION_SQL = """
-- Add is_admin column to organizers
ALTER TABLE organizers ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Set admin flag for amit@ajot.me
UPDATE organizers SET is_admin = TRUE WHERE email = 'amit@ajot.me';
"""

if __name__ == '__main__':
    with app.app_context():
        print("Running admin migration...")
        for statement in MIGRATION_SQL.strip().split(';'):
            statement = statement.strip()
            if statement and not statement.startswith('--'):
                try:
                    db.session.execute(db.text(statement))
                    db.session.commit()
                    print(f"  OK: {statement[:60]}...")
                except Exception as e:
                    db.session.rollback()
                    print(f"  Warning: {e}")
        db.session.commit()
        print("Migration complete.")
