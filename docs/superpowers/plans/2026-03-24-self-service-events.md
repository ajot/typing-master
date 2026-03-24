# Self-Service Event Management — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow conference organizers to create and manage their own typing competition events via a self-service dashboard with magic link authentication.

**Architecture:** Add an Organizer model with magic link auth, a scoped `/dashboard` frontend with a clean professional theme, and `/api/dashboard/` backend routes. The existing admin panel and game experience are untouched. Players and organizers are completely separate entities.

**Tech Stack:** Flask + SQLAlchemy (backend), React 19 + TypeScript + Tailwind CSS (frontend), PostgreSQL, HTTP-only cookies for session auth.

**Spec:** `docs/superpowers/specs/2026-03-24-self-service-events-design.md`

---

## File Structure

### Backend — New Files

| File | Responsibility |
|---|---|
| `backend/routes/auth.py` | Magic link login, verify, logout endpoints |
| `backend/routes/dashboard.py` | Organizer dashboard API (events, players, prompts, export) |
| `backend/middleware.py` | `require_organizer` decorator for session auth |
| `backend/migrate_organizers.py` | One-time migration script to add organizer tables + columns |

### Backend — Modified Files

| File | Change |
|---|---|
| `backend/models.py` | Add `Organizer` model, add columns to `Event` and `Prompt` |
| `backend/app.py` | Register `auth_bp` and `dashboard_bp` blueprints, configure CORS |
| `backend/routes/events.py` | Add date enforcement to `get_event_by_slug` |
| `backend/routes/prompts.py` | Add `event_id` param to `/api/prompts/random`, gate write endpoints |

### Frontend — New Files

| File | Responsibility |
|---|---|
| `frontend/src/layouts/DashboardLayout.tsx` | Clean/professional layout wrapper for dashboard pages |
| `frontend/src/pages/LoginPage.tsx` | Magic link login form + verify handler |
| `frontend/src/pages/DashboardPage.tsx` | Event list, stats, create event |
| `frontend/src/pages/DashboardEventPage.tsx` | Event detail with tabs (leaderboard, players, prompts, settings) |
| `frontend/src/pages/PricingPage.tsx` | Free vs paid comparison |
| `frontend/src/contexts/AuthContext.tsx` | Organizer auth state, login/logout, session check |
| `frontend/src/components/TopBar.tsx` | Slim bar with "Pricing" and "Host an Event" links |

### Frontend — Modified Files

| File | Change |
|---|---|
| `frontend/src/main.tsx` | Add routes: `/login`, `/login/verify`, `/dashboard`, `/dashboard/events/:eventId`, `/pricing` (before `/:slug` catch-all) |
| `frontend/src/components/ResultsScreen.tsx` | Add "Want this at your event?" CTA |
| `frontend/src/App.tsx` | Pass `event_id` to `/api/prompts/random` when in event context |

---

## Task 1: Organizer Model & Migration Script

**Files:**
- Modify: `backend/models.py`
- Create: `backend/migrate_organizers.py`

- [ ] **Step 1: Add Organizer model to models.py**

Add after the `EventConsent` class (after line 117):

```python
class Organizer(db.Model):
    __tablename__ = 'organizers'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    is_active = db.Column(db.Boolean, default=False)
    auth_token_hash = db.Column(db.String(255), nullable=True)
    auth_token_expires_at = db.Column(db.DateTime, nullable=True)
    session_token_hash = db.Column(db.String(255), nullable=True)
    session_expires_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    events = db.relationship('Event', backref='organizer', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat()
        }
```

- [ ] **Step 2: Add new columns to Event model**

Add to the `Event` class in `models.py` (after `config` column, line 76):

```python
    organizer_id = db.Column(db.String(36), db.ForeignKey('organizers.id'), nullable=True)
    starts_at = db.Column(db.DateTime, nullable=True)
    ends_at = db.Column(db.DateTime, nullable=True)
```

Update `Event.to_dict()` to include the new fields:

```python
    def to_dict(self):
        return {
            'id': self.id,
            'slug': self.slug,
            'name': self.name,
            'is_active': self.is_active,
            'config': self.config or {},
            'organizer_id': self.organizer_id,
            'starts_at': self.starts_at.isoformat() if self.starts_at else None,
            'ends_at': self.ends_at.isoformat() if self.ends_at else None,
            'created_at': self.created_at.isoformat()
        }
```

- [ ] **Step 3: Add event_id column to Prompt model**

Add to the `Prompt` class in `models.py` (after `created_at` column, line 53):

```python
    event_id = db.Column(db.String(36), db.ForeignKey('events.id'), nullable=True)
```

Update `Prompt.to_dict()` to include `event_id`:

```python
    'event_id': self.event_id,
```

- [ ] **Step 4: Create migration script**

Create `backend/migrate_organizers.py`:

```python
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
                except Exception as e:
                    print(f"  Warning: {e}")
        db.session.commit()
        print("Migration complete.")
```

- [ ] **Step 5: Run migration against the database**

```bash
cd backend && source venv/bin/activate && python migrate_organizers.py
```

Expected: "Running organizer migration... Migration complete."

- [ ] **Step 6: Commit**

```bash
git add backend/models.py backend/migrate_organizers.py
git commit -m "feat: add Organizer model and schema migration for self-service events"
```

---

## Task 2: Auth Middleware

**Files:**
- Create: `backend/middleware.py`

- [ ] **Step 1: Create auth middleware**

Create `backend/middleware.py`:

```python
"""Authentication middleware for organizer dashboard."""
import hashlib
from functools import wraps
from datetime import datetime
from flask import request, jsonify
from models import Organizer


def hash_token(token):
    """SHA-256 hash a token string."""
    return hashlib.sha256(token.encode()).hexdigest()


def require_organizer(f):
    """Decorator that requires a valid organizer session cookie."""
    @wraps(f)
    def decorated(*args, **kwargs):
        session_token = request.cookies.get('session_token')
        if not session_token:
            return jsonify({'error': 'Authentication required'}), 401

        token_hash = hash_token(session_token)
        organizer = Organizer.query.filter_by(session_token_hash=token_hash).first()

        if not organizer:
            return jsonify({'error': 'Invalid session'}), 401

        if organizer.session_expires_at and organizer.session_expires_at < datetime.utcnow():
            return jsonify({'error': 'Session expired'}), 401

        if not organizer.is_active:
            return jsonify({'error': 'Account is not active', 'inactive': True}), 403

        request.organizer = organizer
        return f(*args, **kwargs)
    return decorated
```

- [ ] **Step 2: Commit**

```bash
git add backend/middleware.py
git commit -m "feat: add organizer auth middleware with session token verification"
```

---

## Task 3: Auth Routes (Magic Link)

**Files:**
- Create: `backend/routes/auth.py`
- Modify: `backend/app.py`

- [ ] **Step 1: Create auth routes**

Create `backend/routes/auth.py`:

```python
"""Authentication routes for organizer magic link login."""
import secrets
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, make_response
from models import db, Organizer
from middleware import hash_token

auth_bp = Blueprint('auth', __name__)

# Rate limit tracking (in-memory, resets on restart — good enough for now)
_login_attempts = {}  # { email: [timestamp, ...] }
RATE_LIMIT = 3
RATE_WINDOW = 900  # 15 minutes in seconds


def _check_rate_limit(email):
    """Returns True if rate limited."""
    now = datetime.utcnow()
    cutoff = now - timedelta(seconds=RATE_WINDOW)
    attempts = _login_attempts.get(email, [])
    attempts = [t for t in attempts if t > cutoff]
    _login_attempts[email] = attempts
    return len(attempts) >= RATE_LIMIT


def _record_attempt(email):
    _login_attempts.setdefault(email, []).append(datetime.utcnow())


@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    """Send magic link to organizer email."""
    data = request.get_json()
    if not data or not data.get('email'):
        return jsonify({'error': 'Email is required'}), 400

    email = data['email'].lower().strip()

    # Always return generic response to prevent email enumeration
    generic_response = jsonify({
        'message': 'If an account exists for that email, a magic link has been sent.'
    })

    if _check_rate_limit(email):
        return generic_response, 200

    _record_attempt(email)

    organizer = Organizer.query.filter_by(email=email).first()
    if not organizer:
        return generic_response, 200

    # Generate magic link token
    token = secrets.token_urlsafe(32)
    organizer.auth_token_hash = hash_token(token)
    organizer.auth_token_expires_at = datetime.utcnow() + timedelta(minutes=15)
    db.session.commit()

    # Print to console for now (Resend integration later)
    print(f"\n{'='*60}")
    print(f"MAGIC LINK for {email}:")
    print(f"  /login/verify?token={token}")
    print(f"{'='*60}\n")

    return generic_response, 200


@auth_bp.route('/api/auth/verify', methods=['POST'])
def verify():
    """Verify magic link token and create session."""
    data = request.get_json()
    if not data or not data.get('token'):
        return jsonify({'error': 'Token is required'}), 400

    token = data['token']
    token_hash = hash_token(token)

    organizer = Organizer.query.filter_by(auth_token_hash=token_hash).first()
    if not organizer:
        return jsonify({'error': 'Invalid or expired link'}), 401

    if organizer.auth_token_expires_at < datetime.utcnow():
        return jsonify({'error': 'Invalid or expired link'}), 401

    # Clear auth token (one-time use)
    organizer.auth_token_hash = None
    organizer.auth_token_expires_at = None

    # Create session
    session_token = secrets.token_urlsafe(32)
    organizer.session_token_hash = hash_token(session_token)
    organizer.session_expires_at = datetime.utcnow() + timedelta(days=30)
    db.session.commit()

    # Set HTTP-only cookie
    response = make_response(jsonify({
        'organizer': organizer.to_dict(),
        'redirect': '/dashboard'
    }))
    response.set_cookie(
        'session_token',
        session_token,
        httponly=True,
        secure=True,
        samesite='Lax',
        max_age=30 * 24 * 60 * 60  # 30 days
    )
    return response


@auth_bp.route('/api/auth/logout', methods=['POST'])
def logout():
    """Clear organizer session."""
    session_token = request.cookies.get('session_token')
    if session_token:
        token_hash = hash_token(session_token)
        organizer = Organizer.query.filter_by(session_token_hash=token_hash).first()
        if organizer:
            organizer.session_token_hash = None
            organizer.session_expires_at = None
            db.session.commit()

    response = make_response(jsonify({'status': 'ok'}))
    response.delete_cookie('session_token')
    return response


@auth_bp.route('/api/auth/me', methods=['GET'])
def get_me():
    """Check current session and return organizer profile."""
    session_token = request.cookies.get('session_token')
    if not session_token:
        return jsonify({'error': 'Not authenticated'}), 401

    token_hash = hash_token(session_token)
    organizer = Organizer.query.filter_by(session_token_hash=token_hash).first()

    if not organizer:
        return jsonify({'error': 'Invalid session'}), 401

    if organizer.session_expires_at and organizer.session_expires_at < datetime.utcnow():
        return jsonify({'error': 'Session expired'}), 401

    return jsonify({'organizer': organizer.to_dict()})
```

- [ ] **Step 2: Register auth blueprint in app.py**

In `backend/app.py`, add the import and registration alongside existing blueprints (after line 39):

```python
    from routes.auth import auth_bp
    app.register_blueprint(auth_bp)
```

- [ ] **Step 3: Update CORS config in app.py**

Replace `CORS(app)` (line 25) with:

```python
    CORS(app, supports_credentials=True, origins=[
        'http://localhost:5173',  # Vite dev server
        'http://localhost:8080',  # Local production
    ])
```

Note: Add the production domain when deploying.

- [ ] **Step 4: Commit**

```bash
git add backend/routes/auth.py backend/app.py
git commit -m "feat: add magic link auth routes and session management for organizers"
```

---

## Task 4: Dashboard API Routes

**Files:**
- Create: `backend/routes/dashboard.py`
- Modify: `backend/app.py`

- [ ] **Step 1: Create dashboard routes**

Create `backend/routes/dashboard.py`:

```python
"""Dashboard API routes for organizer self-service event management."""
import csv
import io
from datetime import datetime
from flask import Blueprint, request, jsonify, Response
from sqlalchemy import func
from models import db, Event, EventConsent, Player, Score, Prompt, Organizer
from middleware import require_organizer

dashboard_bp = Blueprint('dashboard', __name__)

# Reserved slugs — must match frontend reserved list
RESERVED_SLUGS = {
    'admin', 'dashboard', 'login', 'signup', 'pricing', 'leaderboard',
    'api', 'static', 'health', 'about', 'terms', 'privacy', 'vibe', 'play'
}


def _verify_event_ownership(event_id):
    """Verify the current organizer owns the event. Returns (event, error_response)."""
    event = Event.query.get(event_id)
    if not event:
        return None, (jsonify({'error': 'Event not found'}), 404)
    if event.organizer_id != request.organizer.id:
        return None, (jsonify({'error': 'Access denied'}), 403)
    return event, None


# --- Events ---

@dashboard_bp.route('/api/dashboard/events', methods=['GET'])
@require_organizer
def list_events():
    """List organizer's events with summary stats."""
    events = Event.query.filter_by(organizer_id=request.organizer.id)\
        .order_by(Event.created_at.desc()).all()

    result = []
    for event in events:
        player_count = EventConsent.query.filter_by(event_id=event.id).count()
        game_count = Score.query.filter_by(event_id=event.id).count()
        result.append({
            **event.to_dict(),
            'player_count': player_count,
            'game_count': game_count,
        })

    return jsonify(result)


@dashboard_bp.route('/api/dashboard/events', methods=['POST'])
@require_organizer
def create_event():
    """Create a new event."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    slug = data.get('slug', '').strip().lower()
    name = data.get('name', '').strip()

    if not slug or not name:
        return jsonify({'error': 'slug and name are required'}), 400

    if slug in RESERVED_SLUGS:
        return jsonify({'error': 'This slug is reserved'}), 400

    if Event.query.filter_by(slug=slug).first():
        return jsonify({'error': 'An event with this slug already exists'}), 409

    event = Event(
        slug=slug,
        name=name,
        is_active=data.get('is_active', True),
        config=data.get('config', {}),
        organizer_id=request.organizer.id,
        starts_at=_parse_datetime(data.get('starts_at')),
        ends_at=_parse_datetime(data.get('ends_at')),
    )
    db.session.add(event)
    db.session.commit()

    return jsonify(event.to_dict()), 201


@dashboard_bp.route('/api/dashboard/events/<event_id>', methods=['GET'])
@require_organizer
def get_event(event_id):
    """Get event detail with stats."""
    event, error = _verify_event_ownership(event_id)
    if error:
        return error

    player_count = EventConsent.query.filter_by(event_id=event.id).count()
    game_count = Score.query.filter_by(event_id=event.id).count()

    top_score = db.session.query(func.max(Score.score))\
        .filter(Score.event_id == event.id).scalar() or 0

    avg_wpm = db.session.query(func.avg(Score.wpm))\
        .filter(Score.event_id == event.id).scalar()

    return jsonify({
        **event.to_dict(),
        'player_count': player_count,
        'game_count': game_count,
        'top_score': top_score,
        'avg_wpm': round(float(avg_wpm), 1) if avg_wpm else 0,
    })


@dashboard_bp.route('/api/dashboard/events/<event_id>', methods=['PATCH'])
@require_organizer
def update_event(event_id):
    """Update event settings."""
    event, error = _verify_event_ownership(event_id)
    if error:
        return error

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    if 'name' in data:
        event.name = data['name']
    if 'is_active' in data:
        event.is_active = data['is_active']
    if 'config' in data:
        event.config = data['config']
    if 'starts_at' in data:
        event.starts_at = _parse_datetime(data['starts_at'])
    if 'ends_at' in data:
        event.ends_at = _parse_datetime(data['ends_at'])

    db.session.commit()
    return jsonify(event.to_dict())


@dashboard_bp.route('/api/dashboard/events/<event_id>', methods=['DELETE'])
@require_organizer
def delete_event(event_id):
    """Delete event and associated data."""
    event, error = _verify_event_ownership(event_id)
    if error:
        return error

    # Application-level cascade (single transaction)
    # 1. Delete custom prompts for this event
    Prompt.query.filter_by(event_id=event.id).delete()
    # 2. Delete consent records
    EventConsent.query.filter_by(event_id=event.id).delete()
    # 3. Null out event_id on scores (preserve player history)
    Score.query.filter_by(event_id=event.id).update({'event_id': None})
    # 4. Delete the event
    db.session.delete(event)
    db.session.commit()

    return jsonify({'status': 'ok'}), 200


# --- Players ---

@dashboard_bp.route('/api/dashboard/events/<event_id>/players', methods=['GET'])
@require_organizer
def get_event_players(event_id):
    """Get players for an event."""
    event, error = _verify_event_ownership(event_id)
    if error:
        return error

    results = db.session.query(
        Player.first_name,
        Player.last_name,
        Player.nickname,
        Player.email,
        Player.email_type,
        EventConsent.consented,
        EventConsent.ip_address,
        EventConsent.created_at.label('joined_event_at'),
        func.count(Score.id).label('games_played')
    ).join(
        Player, EventConsent.player_id == Player.id
    ).outerjoin(
        Score, (Score.player_id == Player.id) & (Score.event_id == event_id)
    ).filter(
        EventConsent.event_id == event_id
    ).group_by(
        Player.first_name, Player.last_name, Player.nickname,
        Player.email, Player.email_type,
        EventConsent.consented, EventConsent.ip_address, EventConsent.created_at
    ).order_by(
        EventConsent.created_at.asc()
    ).all()

    players = [{
        'first_name': r.first_name,
        'last_name': r.last_name,
        'display_name': f"{r.first_name} {r.last_name[0].upper()}." if r.first_name and r.last_name else r.nickname,
        'email': r.email,
        'email_type': r.email_type,
        'consented': r.consented,
        'ip_address': r.ip_address,
        'joined_event_at': r.joined_event_at.isoformat() if r.joined_event_at else None,
        'games_played': r.games_played or 0
    } for r in results]

    return jsonify({
        'event_id': event_id,
        'event_name': event.name,
        'total_players': len(players),
        'total_games': sum(p['games_played'] for p in players),
        'players': players
    })


@dashboard_bp.route('/api/dashboard/events/<event_id>/players/export', methods=['GET'])
@require_organizer
def export_event_players(event_id):
    """Export event players as CSV."""
    event, error = _verify_event_ownership(event_id)
    if error:
        return error

    # Reuse the same query as get_event_players
    results = db.session.query(
        Player.first_name,
        Player.last_name,
        Player.email,
        Player.email_type,
        EventConsent.consented,
        EventConsent.ip_address,
        EventConsent.created_at.label('joined_event_at'),
        func.count(Score.id).label('games_played')
    ).join(
        Player, EventConsent.player_id == Player.id
    ).outerjoin(
        Score, (Score.player_id == Player.id) & (Score.event_id == event_id)
    ).filter(
        EventConsent.event_id == event_id
    ).group_by(
        Player.first_name, Player.last_name,
        Player.email, Player.email_type,
        EventConsent.consented, EventConsent.ip_address, EventConsent.created_at
    ).order_by(
        EventConsent.created_at.asc()
    ).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['First Name', 'Last Name', 'Email', 'Type', 'Consented', 'IP Address', 'Joined At', 'Games Played'])

    for r in results:
        writer.writerow([
            r.first_name or '',
            r.last_name or '',
            r.email,
            r.email_type or '',
            'Yes' if r.consented is True else ('No' if r.consented is False else 'N/A'),
            r.ip_address or '',
            r.joined_event_at.isoformat() if r.joined_event_at else '',
            r.games_played or 0
        ])

    response = Response(output.getvalue(), mimetype='text/csv')
    response.headers['Content-Disposition'] = f'attachment; filename=event-{event.slug}-players.csv'
    return response


# --- Leaderboard ---

@dashboard_bp.route('/api/dashboard/events/<event_id>/leaderboard', methods=['GET'])
@require_organizer
def get_event_leaderboard(event_id):
    """Get event leaderboard (best score per player)."""
    event, error = _verify_event_ownership(event_id)
    if error:
        return error

    results = db.session.query(
        Player.id,
        Player.first_name,
        Player.last_name,
        Player.nickname,
        Player.email,
        func.max(Score.score).label('best_score'),
        func.max(Score.wpm).label('best_wpm'),
        func.count(Score.id).label('games_played')
    ).join(
        Score, Score.player_id == Player.id
    ).filter(
        Score.event_id == event_id,
        Player.is_hidden == False
    ).group_by(
        Player.id, Player.first_name, Player.last_name,
        Player.nickname, Player.email
    ).order_by(
        func.max(Score.score).desc()
    ).limit(50).all()

    leaderboard = [{
        'display_name': f"{r.first_name} {r.last_name[0].upper()}." if r.first_name and r.last_name else r.nickname,
        'email': r.email,
        'best_score': r.best_score,
        'best_wpm': r.best_wpm,
        'games_played': r.games_played,
    } for r in results]

    return jsonify({
        'event_id': event_id,
        'event_name': event.name,
        'leaderboard': leaderboard
    })


# --- Custom Prompts ---

@dashboard_bp.route('/api/dashboard/events/<event_id>/prompts', methods=['GET'])
@require_organizer
def list_event_prompts(event_id):
    """List custom prompts for an event."""
    event, error = _verify_event_ownership(event_id)
    if error:
        return error

    prompts = Prompt.query.filter_by(event_id=event.id)\
        .order_by(Prompt.created_at.desc()).all()

    return jsonify([p.to_dict() for p in prompts])


@dashboard_bp.route('/api/dashboard/events/<event_id>/prompts', methods=['POST'])
@require_organizer
def create_event_prompt(event_id):
    """Create a custom prompt for an event."""
    event, error = _verify_event_ownership(event_id)
    if error:
        return error

    data = request.get_json()
    if not data or not data.get('text'):
        return jsonify({'error': 'text is required'}), 400

    prompt = Prompt(
        text=data['text'],
        category=data.get('category', 'custom'),
        difficulty=data.get('difficulty', 'medium'),
        is_active=data.get('is_active', True),
        event_id=event.id,
    )
    db.session.add(prompt)
    db.session.commit()

    return jsonify(prompt.to_dict()), 201


@dashboard_bp.route('/api/dashboard/events/<event_id>/prompts/<prompt_id>', methods=['PATCH'])
@require_organizer
def update_event_prompt(event_id, prompt_id):
    """Update a custom prompt."""
    event, error = _verify_event_ownership(event_id)
    if error:
        return error

    prompt = Prompt.query.filter_by(id=prompt_id, event_id=event.id).first()
    if not prompt:
        return jsonify({'error': 'Prompt not found'}), 404

    data = request.get_json()
    if 'text' in data:
        prompt.text = data['text']
    if 'category' in data:
        prompt.category = data['category']
    if 'difficulty' in data:
        prompt.difficulty = data['difficulty']
    if 'is_active' in data:
        prompt.is_active = data['is_active']

    db.session.commit()
    return jsonify(prompt.to_dict())


@dashboard_bp.route('/api/dashboard/events/<event_id>/prompts/<prompt_id>', methods=['DELETE'])
@require_organizer
def delete_event_prompt(event_id, prompt_id):
    """Delete a custom prompt."""
    event, error = _verify_event_ownership(event_id)
    if error:
        return error

    prompt = Prompt.query.filter_by(id=prompt_id, event_id=event.id).first()
    if not prompt:
        return jsonify({'error': 'Prompt not found'}), 404

    db.session.delete(prompt)
    db.session.commit()

    return jsonify({'status': 'ok'}), 200


# --- Helpers ---

def _parse_datetime(value):
    """Parse ISO datetime string or return None."""
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace('Z', '+00:00'))
    except (ValueError, AttributeError):
        return None
```

- [ ] **Step 2: Register dashboard blueprint in app.py**

Add alongside the auth blueprint registration:

```python
    from routes.dashboard import dashboard_bp
    app.register_blueprint(dashboard_bp)
```

- [ ] **Step 3: Commit**

```bash
git add backend/routes/dashboard.py backend/app.py
git commit -m "feat: add organizer dashboard API routes for events, players, prompts"
```

---

## Task 5: Admin Organizer Management Routes

**Files:**
- Modify: `backend/routes/admin.py`

- [ ] **Step 1: Add organizer CRUD routes to admin.py**

Add at the end of `backend/routes/admin.py`:

```python
# --- Organizer Management (Super Admin) ---

@admin_bp.route('/api/admin/organizers', methods=['GET'])
def list_organizers():
    """List all organizers."""
    organizers = Organizer.query.order_by(Organizer.created_at.desc()).all()
    return jsonify([o.to_dict() for o in organizers])


@admin_bp.route('/api/admin/organizers', methods=['POST'])
def create_organizer():
    """Create a new organizer account."""
    data = request.get_json()
    if not data or not data.get('email') or not data.get('name'):
        return jsonify({'error': 'email and name are required'}), 400

    email = data['email'].lower().strip()
    if Organizer.query.filter_by(email=email).first():
        return jsonify({'error': 'Organizer with this email already exists'}), 409

    organizer = Organizer(
        email=email,
        name=data['name'],
        is_active=data.get('is_active', False),
    )
    db.session.add(organizer)
    db.session.commit()

    return jsonify(organizer.to_dict()), 201


@admin_bp.route('/api/admin/organizers/<organizer_id>', methods=['PATCH'])
def update_organizer(organizer_id):
    """Update organizer (activate/deactivate)."""
    organizer = Organizer.query.get(organizer_id)
    if not organizer:
        return jsonify({'error': 'Organizer not found'}), 404

    data = request.get_json()
    if 'is_active' in data:
        organizer.is_active = data['is_active']
    if 'name' in data:
        organizer.name = data['name']

    db.session.commit()
    return jsonify(organizer.to_dict())


@admin_bp.route('/api/admin/organizers/<organizer_id>', methods=['DELETE'])
def delete_organizer(organizer_id):
    """Delete an organizer."""
    organizer = Organizer.query.get(organizer_id)
    if not organizer:
        return jsonify({'error': 'Organizer not found'}), 404

    # Null out organizer_id on owned events (preserve events, remove ownership)
    Event.query.filter_by(organizer_id=organizer_id).update({'organizer_id': None})
    db.session.delete(organizer)
    db.session.commit()
    return jsonify({'status': 'ok'}), 200
```

Also add `Organizer` to the import at the top of the file:

```python
from models import db, Player, Score, Event, EventConsent, Organizer, Prompt
```

- [ ] **Step 2: Commit**

```bash
git add backend/routes/admin.py
git commit -m "feat: add organizer CRUD routes to admin panel"
```

---

## Task 6: Modify Existing Backend Routes

**Files:**
- Modify: `backend/routes/prompts.py`
- Modify: `backend/routes/events.py`

- [ ] **Step 1: Add event_id param to random prompt endpoint**

In `backend/routes/prompts.py`, modify the `get_random_prompt` function (lines 19-31). Replace the existing function with:

```python
@prompts_bp.route('/api/prompts/random', methods=['GET'])
def get_random_prompt():
    """Get a random active prompt, optionally scoped to an event."""
    event_id = request.args.get('event_id')

    if event_id:
        # Check for custom prompts for this event
        event_prompt = Prompt.query.filter_by(
            event_id=event_id, is_active=True
        ).order_by(func.random()).first()
        if event_prompt:
            event_prompt.times_used += 1
            db.session.commit()
            return jsonify(event_prompt.to_dict())

    # Fall back to global prompts (event_id is NULL)
    prompt = Prompt.query.filter_by(
        is_active=True, event_id=None
    ).order_by(func.random()).first()

    if not prompt:
        return jsonify({'error': 'No prompts available'}), 404

    prompt.times_used += 1
    db.session.commit()
    return jsonify(prompt.to_dict())
```

Note: `func` is already imported in the existing file (from `sqlalchemy.sql.expression import func`), and `request` is already imported from flask. No new imports needed.

- [ ] **Step 2: Gate prompt write endpoints behind admin check**

In `backend/routes/prompts.py`, add an admin check to POST, PATCH, DELETE endpoints. Add at the top of each handler:

```python
    if os.getenv('FLASK_ENV') != 'development' and os.getenv('ENABLE_ADMIN') != 'true':
        return jsonify({'error': 'Admin access required'}), 403
```

Add `import os` at the top if not present.

- [ ] **Step 3: Add date enforcement to event slug lookup**

In `backend/routes/events.py`, modify `get_event_by_slug` (lines 9-15). Replace with:

```python
@events_bp.route('/events/<slug>', methods=['GET'])
def get_event_by_slug(slug):
    """Get event config by slug (public)"""
    event = Event.query.filter_by(slug=slug, is_active=True).first()
    if not event:
        return jsonify({'error': 'Event not found'}), 404

    now = datetime.utcnow()
    if event.starts_at and event.starts_at > now:
        return jsonify({'error': 'Event not found'}), 404
    if event.ends_at and event.ends_at < now:
        return jsonify({'error': 'Event not found'}), 404

    return jsonify(event.to_dict())
```

- [ ] **Step 4: Commit**

```bash
git add backend/routes/prompts.py backend/routes/events.py
git commit -m "feat: add event_id to prompt selection, gate prompt writes, enforce event dates"
```

---

## Task 7: Frontend Auth Context

**Files:**
- Create: `frontend/src/contexts/AuthContext.tsx`

- [ ] **Step 1: Create auth context**

Create `frontend/src/contexts/AuthContext.tsx`:

```tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

type Organizer = {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  created_at: string;
};

type AuthContextType = {
  organizer: Organizer | null;
  loading: boolean;
  login: (email: string) => Promise<{ success: boolean; message: string }>;
  verify: (token: string) => Promise<{ success: boolean; redirect?: string; error?: string }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check existing session on mount
    fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.organizer) setOrganizer(data.organizer);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      credentials: 'include',
    });
    const data = await res.json();
    return { success: res.ok, message: data.message || data.error };
  };

  const verify = async (token: string) => {
    const res = await fetch(`${API_BASE}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      credentials: 'include',
    });
    const data = await res.json();
    if (res.ok) {
      setOrganizer(data.organizer);
      return { success: true, redirect: data.redirect };
    }
    return { success: false, error: data.error };
  };

  const logout = async () => {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    setOrganizer(null);
  };

  return (
    <AuthContext.Provider value={{ organizer, loading, login, verify, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/contexts/AuthContext.tsx
git commit -m "feat: add AuthContext for organizer session management"
```

---

## Task 8: Dashboard Layout

**Files:**
- Create: `frontend/src/layouts/DashboardLayout.tsx`

- [ ] **Step 1: Create dashboard layout**

Create `frontend/src/layouts/DashboardLayout.tsx`:

```tsx
import { Outlet, Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function DashboardLayout() {
  const { organizer, loading, logout } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!organizer) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 items-center">
            <div className="flex items-center gap-6">
              <Link to="/dashboard" className="text-lg font-semibold text-gray-900">
                Type the Cloud
              </Link>
              <Link
                to="/dashboard"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Events
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">{organizer.email}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/layouts/DashboardLayout.tsx
git commit -m "feat: add clean professional dashboard layout component"
```

---

## Task 9: Login Page

**Files:**
- Create: `frontend/src/pages/LoginPage.tsx`

- [ ] **Step 1: Create login page**

Create `frontend/src/pages/LoginPage.tsx`:

```tsx
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const result = await login(email.trim());
    setSubmitting(false);

    if (result.success) {
      setSent(true);
    } else {
      setError(result.message);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Check your email</h1>
          <p className="text-gray-600 mb-6">
            If an account exists for <strong>{email}</strong>, we've sent a login link.
            It expires in 15 minutes.
          </p>
          <button
            onClick={() => { setSent(false); setEmail(''); }}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Try a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-semibold text-gray-900">Type the Cloud</Link>
          <p className="text-gray-600 mt-2">Organizer login</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !email.trim()}
            className="w-full mt-4 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Sending...' : 'Send login link'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Want to host your own typing competition?{' '}
            <a href="mailto:amit@ajot.me" className="text-blue-600 hover:text-blue-800">
              Contact us to get started
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}


export function VerifyPage() {
  const [searchParams] = useSearchParams();
  const { verify } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('No token provided');
      setVerifying(false);
      return;
    }

    verify(token).then(result => {
      if (result.success) {
        navigate(result.redirect || '/dashboard');
      } else {
        setError(result.error || 'Verification failed');
        setVerifying(false);
      }
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        {verifying ? (
          <p className="text-gray-600">Verifying your login link...</p>
        ) : (
          <div>
            <p className="text-red-600 mb-4">{error}</p>
            <Link to="/login" className="text-blue-600 hover:text-blue-800 text-sm">
              Back to login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/LoginPage.tsx
git commit -m "feat: add login page with magic link flow and verify handler"
```

---

## Task 10: Dashboard Page (Event List)

**Files:**
- Create: `frontend/src/pages/DashboardPage.tsx`

- [ ] **Step 1: Create dashboard page**

Create `frontend/src/pages/DashboardPage.tsx`:

```tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || '';

type EventSummary = {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  player_count: number;
  game_count: number;
  created_at: string;
};

const RESERVED_SLUGS = new Set([
  'admin', 'dashboard', 'login', 'signup', 'pricing', 'leaderboard',
  'api', 'static', 'health', 'about', 'terms', 'privacy', 'vibe', 'play'
]);

export default function DashboardPage() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [slugError, setSlugError] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchEvents = () => {
    fetch(`${API_BASE}/api/dashboard/events`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setEvents(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleSlugChange = (value: string) => {
    const slug = value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    setNewSlug(slug);
    if (RESERVED_SLUGS.has(slug)) {
      setSlugError('This slug is reserved');
    } else {
      setSlugError('');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newSlug.trim() || slugError) return;
    setCreating(true);

    const res = await fetch(`${API_BASE}/api/dashboard/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), slug: newSlug.trim() }),
      credentials: 'include',
    });

    if (res.ok) {
      setNewName('');
      setNewSlug('');
      setShowCreate(false);
      fetchEvents();
    } else {
      const data = await res.json();
      setSlugError(data.error || 'Failed to create event');
    }
    setCreating(false);
  };

  if (loading) {
    return <div className="text-gray-400">Loading events...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Events</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800"
        >
          Create Event
        </button>
      </div>

      {/* Create event form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="GTC 2026"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug</label>
              <input
                type="text"
                value={newSlug}
                onChange={e => handleSlugChange(e.target.value)}
                placeholder="gtc-2026"
                required
                className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${slugError ? 'border-red-300' : 'border-gray-300'}`}
              />
              {slugError && <p className="text-red-600 text-xs mt-1">{slugError}</p>}
              {newSlug && !slugError && (
                <p className="text-gray-400 text-xs mt-1">Players will visit: /{newSlug}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              disabled={creating || !newName.trim() || !newSlug.trim() || !!slugError}
              className="px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-gray-600 text-sm rounded-md hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Events list */}
      {events.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-500 mb-2">No events yet</p>
          <p className="text-gray-400 text-sm">Create your first event to get started.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Event</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Slug</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Players</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Games</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Created</th>
              </tr>
            </thead>
            <tbody>
              {events.map(event => (
                <tr key={event.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      to={`/dashboard/events/${event.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-blue-600"
                    >
                      {event.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">/{event.slug}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      event.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {event.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600">{event.player_count}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600">{event.game_count}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-400">
                    {new Date(event.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/DashboardPage.tsx
git commit -m "feat: add dashboard page with event list and create form"
```

---

## Task 11: Dashboard Event Detail Page

**Files:**
- Create: `frontend/src/pages/DashboardEventPage.tsx`

- [ ] **Step 1: Create event detail page**

Create `frontend/src/pages/DashboardEventPage.tsx`. This is a larger file with tabs for Leaderboard, Players, Prompts, and Settings.

```tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || '';

type EventDetail = {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
  config: Record<string, unknown>;
  organizer_id: string;
  starts_at: string | null;
  ends_at: string | null;
  player_count: number;
  game_count: number;
  top_score: number;
  avg_wpm: number;
  created_at: string;
};

type Player = {
  first_name: string | null;
  last_name: string | null;
  display_name: string;
  email: string;
  email_type: string | null;
  consented: boolean | null;
  games_played: number;
};

type LeaderboardEntry = {
  display_name: string;
  email: string;
  best_score: number;
  best_wpm: number;
  games_played: number;
};

type PromptItem = {
  id: string;
  text: string;
  category: string;
  difficulty: string;
  is_active: boolean;
  times_used: number;
};

type Tab = 'leaderboard' | 'players' | 'prompts' | 'settings';

export default function DashboardEventPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [tab, setTab] = useState<Tab>('leaderboard');
  const [loading, setLoading] = useState(true);

  // Tab data
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [prompts, setPrompts] = useState<PromptItem[]>([]);

  // Settings form
  const [settingsName, setSettingsName] = useState('');
  const [settingsActive, setSettingsActive] = useState(true);
  const [settingsStartsAt, setSettingsStartsAt] = useState('');
  const [settingsEndsAt, setSettingsEndsAt] = useState('');
  const [consentEnabled, setConsentEnabled] = useState(false);
  const [consentLabel, setConsentLabel] = useState('');
  const [consentRequired, setConsentRequired] = useState(true);
  const [saving, setSaving] = useState(false);

  // Prompt form
  const [newPromptText, setNewPromptText] = useState('');
  const [creatingPrompt, setCreatingPrompt] = useState(false);

  const fetchOpts = { credentials: 'include' as const };

  const fetchEvent = () => {
    fetch(`${API_BASE}/api/dashboard/events/${eventId}`, fetchOpts)
      .then(res => { if (!res.ok) throw new Error(); return res.json(); })
      .then(data => {
        setEvent(data);
        setSettingsName(data.name);
        setSettingsActive(data.is_active);
        setSettingsStartsAt(data.starts_at ? data.starts_at.slice(0, 16) : '');
        setSettingsEndsAt(data.ends_at ? data.ends_at.slice(0, 16) : '');
        const consent = (data.config?.consent as { enabled?: boolean; label?: string; required?: boolean }) || {};
        setConsentEnabled(consent.enabled || false);
        setConsentLabel(consent.label || 'I agree to receive emails');
        setConsentRequired(consent.required ?? true);
      })
      .catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchEvent(); }, [eventId]);

  useEffect(() => {
    if (!eventId) return;
    if (tab === 'leaderboard') {
      fetch(`${API_BASE}/api/dashboard/events/${eventId}/leaderboard`, fetchOpts)
        .then(res => res.json())
        .then(data => setLeaderboard(data.leaderboard || []));
    } else if (tab === 'players') {
      fetch(`${API_BASE}/api/dashboard/events/${eventId}/players`, fetchOpts)
        .then(res => res.json())
        .then(data => setPlayers(data.players || []));
    } else if (tab === 'prompts') {
      fetch(`${API_BASE}/api/dashboard/events/${eventId}/prompts`, fetchOpts)
        .then(res => res.json())
        .then(data => setPrompts(data));
    }
  }, [eventId, tab]);

  const handleSaveSettings = async () => {
    setSaving(true);
    const config: Record<string, unknown> = { ...(event?.config || {}) };
    if (consentEnabled) {
      config.consent = { enabled: true, label: consentLabel, required: consentRequired };
    } else {
      delete config.consent;
    }

    await fetch(`${API_BASE}/api/dashboard/events/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: settingsName,
        is_active: settingsActive,
        config,
        starts_at: settingsStartsAt || null,
        ends_at: settingsEndsAt || null,
      }),
      credentials: 'include',
    });
    fetchEvent();
    setSaving(false);
  };

  const handleExportCSV = async () => {
    const res = await fetch(`${API_BASE}/api/dashboard/events/${eventId}/players/export`, {
      credentials: 'include',
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `event-${event?.slug}-players.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreatePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromptText.trim()) return;
    setCreatingPrompt(true);
    await fetch(`${API_BASE}/api/dashboard/events/${eventId}/prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: newPromptText.trim() }),
      credentials: 'include',
    });
    setNewPromptText('');
    setCreatingPrompt(false);
    // Refresh prompts
    fetch(`${API_BASE}/api/dashboard/events/${eventId}/prompts`, fetchOpts)
      .then(res => res.json())
      .then(data => setPrompts(data));
  };

  const handleDeletePrompt = async (promptId: string) => {
    if (!confirm('Delete this prompt?')) return;
    await fetch(`${API_BASE}/api/dashboard/events/${eventId}/prompts/${promptId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    setPrompts(prev => prev.filter(p => p.id !== promptId));
  };

  const handleDeleteEvent = async () => {
    if (!confirm('This will permanently delete the event and its consent records. Player scores will be preserved. This cannot be undone.')) return;
    await fetch(`${API_BASE}/api/dashboard/events/${eventId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    navigate('/dashboard');
  };

  if (loading || !event) {
    return <div className="text-gray-400">Loading...</div>;
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'leaderboard', label: 'Leaderboard' },
    { key: 'players', label: 'Players' },
    { key: 'prompts', label: 'Prompts' },
    { key: 'settings', label: 'Settings' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <p className="text-sm text-gray-500 mb-1">/{event.slug}</p>
        <h1 className="text-2xl font-semibold text-gray-900">{event.name}</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Players', value: event.player_count },
          { label: 'Games', value: event.game_count },
          { label: 'Top Score', value: event.top_score.toLocaleString() },
          { label: 'Avg WPM', value: event.avg_wpm },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-6">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-3 text-sm font-medium border-b-2 ${
                tab === t.key
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'leaderboard' && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {leaderboard.length === 0 ? (
            <p className="p-8 text-center text-gray-400">No scores yet</p>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">#</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Player</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Best Score</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">WPM</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Games</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="px-4 py-3 text-sm text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{entry.display_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{entry.email}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">{entry.best_score.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">{entry.best_wpm}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-400">{entry.games_played}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'players' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Export CSV
            </button>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {players.length === 0 ? (
              <p className="p-8 text-center text-gray-400">No players yet</p>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Consent</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Games</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((player, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{player.display_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{player.email}</td>
                      <td className="px-4 py-3 text-center text-sm">
                        {player.consented === true ? (
                          <span className="text-green-600">Yes</span>
                        ) : player.consented === false ? (
                          <span className="text-red-600">No</span>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600">{player.games_played}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'prompts' && (
        <div>
          <form onSubmit={handleCreatePrompt} className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Add Custom Prompt</label>
            <textarea
              value={newPromptText}
              onChange={e => setNewPromptText(e.target.value)}
              placeholder="Enter the typing text that players will see..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={creatingPrompt || !newPromptText.trim()}
              className="mt-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800 disabled:opacity-50"
            >
              {creatingPrompt ? 'Adding...' : 'Add Prompt'}
            </button>
          </form>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {prompts.length === 0 ? (
              <p className="p-8 text-center text-gray-400">
                No custom prompts. Players will use the global prompt pool.
              </p>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Text</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Used</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {prompts.map(prompt => (
                    <tr key={prompt.id} className="border-b border-gray-100">
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-md truncate">{prompt.text}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-400">{prompt.times_used}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDeletePrompt(prompt.id)}
                          className="text-sm text-red-500 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div className="max-w-lg">
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
              <input
                type="text"
                value={settingsName}
                onChange={e => setSettingsName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={settingsActive}
                onChange={e => setSettingsActive(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="active" className="text-sm text-gray-700">Event is active</label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Starts At</label>
                <input
                  type="datetime-local"
                  value={settingsStartsAt}
                  onChange={e => setSettingsStartsAt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ends At</label>
                <input
                  type="datetime-local"
                  value={settingsEndsAt}
                  onChange={e => setSettingsEndsAt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <hr className="border-gray-200" />

            <div>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="consent"
                  checked={consentEnabled}
                  onChange={e => setConsentEnabled(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="consent" className="text-sm font-medium text-gray-700">Enable consent checkbox</label>
              </div>
              {consentEnabled && (
                <div className="ml-6 space-y-2">
                  <input
                    type="text"
                    value={consentLabel}
                    onChange={e => setConsentLabel(e.target.value)}
                    placeholder="Consent label text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="consentRequired"
                      checked={consentRequired}
                      onChange={e => setConsentRequired(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="consentRequired" className="text-sm text-gray-700">Required</label>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>

          {/* Danger zone */}
          <div className="mt-8 bg-white border border-red-200 rounded-lg p-6">
            <h3 className="text-sm font-medium text-red-600 mb-2">Danger Zone</h3>
            <p className="text-sm text-gray-500 mb-4">
              Deleting this event will remove all consent records. Player scores will be preserved.
            </p>
            <button
              onClick={handleDeleteEvent}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
            >
              Delete Event
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/DashboardEventPage.tsx
git commit -m "feat: add dashboard event detail page with leaderboard, players, prompts, settings tabs"
```

---

## Task 12: Pricing Page

**Files:**
- Create: `frontend/src/pages/PricingPage.tsx`

- [ ] **Step 1: Create pricing page**

Create `frontend/src/pages/PricingPage.tsx`:

```tsx
import { Link } from 'react-router-dom';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">Host Your Own Typing Competition</h1>
        <p className="text-gray-600 mb-12">Run "Type the Cloud" at your conference, meetup, or team event.</p>

        <div className="grid grid-cols-2 gap-6 mb-12">
          {/* Free */}
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-left">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Free</h2>
            <p className="text-gray-500 text-sm mb-6">Play on the homepage</p>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">&#10003;</span>
                Unlimited games
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">&#10003;</span>
                Public leaderboard
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">&#10003;</span>
                Retro 8-bit experience
              </li>
            </ul>
            <Link
              to="/"
              className="block mt-8 text-center px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50"
            >
              Play Now
            </Link>
          </div>

          {/* Paid */}
          <div className="bg-white border-2 border-gray-900 rounded-lg p-8 text-left relative">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Event</h2>
            <p className="text-gray-500 text-sm mb-6">For conferences & teams</p>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">&#10003;</span>
                Unlimited events
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">&#10003;</span>
                Private event leaderboards
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">&#10003;</span>
                Player data & CSV export
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">&#10003;</span>
                Custom typing prompts
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">&#10003;</span>
                Consent management
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">&#10003;</span>
                Event scheduling (start/end dates)
              </li>
            </ul>
            <a
              href="mailto:amit@ajot.me"
              className="block mt-8 text-center px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800"
            >
              Contact Us
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/PricingPage.tsx
git commit -m "feat: add pricing page with free vs paid comparison"
```

---

## Task 13: Top Bar & Results Screen CTA

**Files:**
- Create: `frontend/src/components/TopBar.tsx`
- Modify: `frontend/src/components/ResultsScreen.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create TopBar component**

Create `frontend/src/components/TopBar.tsx`:

```tsx
import { Link } from 'react-router-dom';

export default function TopBar() {
  return (
    <div className="w-full bg-black/50 border-b border-white/10 py-1.5 px-4 flex justify-end gap-4">
      <Link to="/pricing" className="text-[10px] text-white/50 hover:text-white/80 uppercase tracking-wider">
        Pricing
      </Link>
      <Link to="/login" className="text-[10px] text-white/50 hover:text-white/80 uppercase tracking-wider">
        Host an Event
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Add TopBar to App.tsx**

In `frontend/src/App.tsx`, import `TopBar` and render it at the top of the component's return, before the existing content:

```tsx
import TopBar from './components/TopBar';
```

Add `<TopBar />` as the first element inside the outermost wrapper div.

- [ ] **Step 3: Add CTA to ResultsScreen**

In `frontend/src/components/ResultsScreen.tsx`, add a "Want this at your event?" link. Add after the existing results content, before the action buttons:

```tsx
import { Link } from 'react-router-dom';
```

Add this block in the results screen JSX:

```tsx
<div className="mt-4 text-center">
  <Link
    to="/pricing"
    className="text-[10px] text-retro-gray hover:text-white uppercase tracking-wider"
  >
    Want this at your event? →
  </Link>
</div>
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/TopBar.tsx frontend/src/components/ResultsScreen.tsx frontend/src/App.tsx
git commit -m "feat: add top bar with pricing/host links and results screen CTA"
```

---

## Task 14: Frontend Routing

**Files:**
- Modify: `frontend/src/main.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Update router in main.tsx**

In `frontend/src/main.tsx`, add the new routes **before** the `/:eventSlug` catch-all. Import the new components:

```tsx
import { AuthProvider } from './contexts/AuthContext';
import LoginPage, { VerifyPage } from './pages/LoginPage';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import DashboardEventPage from './pages/DashboardEventPage';
import PricingPage from './pages/PricingPage';
```

Add the new routes inside `<Routes>`, before `/:eventSlug`:

```tsx
<Route path="/login" element={<AuthProvider><LoginPage /></AuthProvider>} />
<Route path="/login/verify" element={<AuthProvider><VerifyPage /></AuthProvider>} />
<Route path="/pricing" element={<PricingPage />} />
<Route path="/dashboard" element={<AuthProvider><DashboardLayout /></AuthProvider>}>
  <Route index element={<DashboardPage />} />
  <Route path="events/:eventId" element={<DashboardEventPage />} />
</Route>
```

- [ ] **Step 2: Pass event_id to prompt fetch in App.tsx**

In `frontend/src/App.tsx`, modify **both** prompt fetches to include `event_id` when in event context:

1. The initial fetch in `handleStart` (around line 142):
2. The "play again" fetch in `handlePlayAgain` (around line 213):

For both, replace the prompt fetch with:

```tsx
const promptUrl = event
  ? `${API_BASE}/api/prompts/random?event_id=${event.id}`
  : `${API_BASE}/api/prompts/random`;
const promptRes = await fetch(promptUrl);
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/main.tsx frontend/src/App.tsx
git commit -m "feat: add dashboard, login, pricing routes and event-scoped prompt fetching"
```

---

## Task 15: CORS & Production Config

**Files:**
- Modify: `backend/app.py`
- Modify: `.do/app.yaml`

- [ ] **Step 1: Add production origin to CORS**

In `backend/app.py`, update the CORS config to include the production domain. Use an env var:

```python
    allowed_origins = [
        'http://localhost:5173',
        'http://localhost:8080',
    ]
    prod_origin = os.getenv('CORS_ORIGIN')
    if prod_origin:
        allowed_origins.append(prod_origin)
    CORS(app, supports_credentials=True, origins=allowed_origins)
```

- [ ] **Step 2: Add CORS_ORIGIN env var to .do/app.yaml**

Add under the existing env vars:

```yaml
        - key: CORS_ORIGIN
          value: "${APP_URL}"
```

- [ ] **Step 3: Commit**

```bash
git add backend/app.py .do/app.yaml
git commit -m "feat: configure CORS for credential-based dashboard auth"
```

---

## Task 16: End-to-End Smoke Test

- [ ] **Step 1: Run the migration**

```bash
cd backend && source venv/bin/activate && python migrate_organizers.py
```

- [ ] **Step 2: Create a test organizer via the admin API**

```bash
curl -X POST http://localhost:8080/api/admin/organizers \
  -H "Content-Type: application/json" \
  -d '{"email": "test@ajot.me", "name": "Test Organizer", "is_active": true}'
```

- [ ] **Step 3: Request a magic link**

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@ajot.me"}'
```

Check the backend console for the magic link token.

- [ ] **Step 4: Verify the magic link**

```bash
curl -X POST http://localhost:8080/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"token": "<token-from-console>"}' \
  -c cookies.txt
```

- [ ] **Step 5: Create an event via the dashboard API**

```bash
curl -X POST http://localhost:8080/api/dashboard/events \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name": "Test Event", "slug": "test-event-2026"}'
```

- [ ] **Step 6: Verify the full frontend flow**

Start both servers:
```bash
# Terminal 1
cd backend && source venv/bin/activate && python app.py

# Terminal 2
cd frontend && npm run dev
```

Test in browser:
1. Visit `http://localhost:5173/login` — enter `test@ajot.me`
2. Copy the magic link token from the backend console
3. Visit `http://localhost:5173/login/verify?token=<token>`
4. Verify redirect to `/dashboard`
5. Create an event, verify it appears in the list
6. Click into the event, check all tabs render
7. Visit `http://localhost:5173/pricing` — verify pricing page
8. Play a game on homepage — verify TopBar and results CTA appear

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: complete self-service event management for organizers"
```
