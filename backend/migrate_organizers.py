"""Migration: Add organizer tables and columns for self-service events."""
import os
import sys
from dotenv import load_dotenv

load_dotenv()

from app import create_app
from models import db

app = create_app()

MIGRATION_SQL = """
-- Create organizers table
CREATE TABLE IF NOT EXISTS organizers (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    auth_token_hash VARCHAR(255),
    auth_token_expires_at TIMESTAMP,
    session_token_hash VARCHAR(255),
    session_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_organizers_email ON organizers (email);

-- Add organizer_id, starts_at, ends_at to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS organizer_id VARCHAR(36) REFERENCES organizers(id);
ALTER TABLE events ADD COLUMN IF NOT EXISTS starts_at TIMESTAMP;
ALTER TABLE events ADD COLUMN IF NOT EXISTS ends_at TIMESTAMP;

-- Add event_id to prompts (SET NULL on delete so admin delete_event doesn't fail)
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS event_id VARCHAR(36) REFERENCES events(id) ON DELETE SET NULL;
"""

if __name__ == '__main__':
    with app.app_context():
        print("Running organizer migration...")
        for statement in MIGRATION_SQL.strip().split(';'):
            statement = statement.strip()
            if statement and not statement.startswith('--'):
                try:
                    db.session.execute(db.text(statement))
                    db.session.commit()
                except Exception as e:
                    db.session.rollback()
                    print(f"  Warning: {e}")
        db.session.commit()
        print("Migration complete.")
