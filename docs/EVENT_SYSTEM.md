# Event System for "Type the Cloud"

## Context

The game is used at events (e.g., AI Summit, conferences). Currently there's a single global experience at `/`. We need custom event URLs (like `/ai-summit`) with per-event landing pages, consent checkboxes (raffle/email opt-in), and isolated leaderboards — while keeping the core gameplay identical.

---

## Database Changes

### New model: `Event` (in `backend/models.py`)
| Column | Type | Notes |
|--------|------|-------|
| id | String(36) PK | UUID |
| slug | String(100) unique, indexed | URL path, e.g. `ai-summit` |
| name | String(200) | Display name, e.g. "AI Summit NYC 2026" |
| is_active | Boolean (default True) | Deactivate old events |
| config | JSON (default {}) | Flexible customization — see below |
| created_at | DateTime | |

**`config` JSON structure** (all keys optional, frontend falls back to defaults):
```json
{
  "subtitle": "AI SUMMIT EDITION",
  "consent": {
    "enabled": true,
    "label": "I agree to receive emails from DigitalOcean",
    "required": true
  },
  "leaderboard_title": "AI SUMMIT LEADERBOARD"
}
```

### New model: `EventConsent` (in `backend/models.py`)
| Column | Type | Notes |
|--------|------|-------|
| id | String(36) PK | UUID |
| event_id | FK → events.id | |
| player_id | FK → players.id | |
| consented | Boolean, nullable | True/False if checkbox shown, null if no consent config |
| consent_text | Text, nullable | Snapshot of label at time of consent |
| ip_address | String(45), nullable | Client IP (from X-Forwarded-For behind proxy) |
| created_at | DateTime | Timestamp of first event engagement |

Unique constraint on `(event_id, player_id)` — one record per player per event.

**Always created** when a player first plays at an event, even if no consent checkbox is configured. This gives you a record of every player's first engagement with each event, including timestamp and IP.

### Modified model: `Score`
Add:
- `event_id = Column(String(36), ForeignKey('events.id'), nullable=True)` — null for default `/` games
- `started_at = Column(DateTime, nullable=True)` — when the player clicked play (sent from frontend)

`nullable=True` on both — existing scores remain unchanged.

### Migration note
`db.create_all()` will create the new tables but won't add columns to the existing `scores` table. For production, run:
```sql
ALTER TABLE scores ADD COLUMN event_id VARCHAR(36) REFERENCES events(id);
ALTER TABLE scores ADD COLUMN started_at TIMESTAMP;
```

---

## Backend Route Changes

### New file: `backend/routes/events.py`
- `GET /api/events/<slug>` — Public. Returns event config by slug (404 if not found or inactive). Used by frontend on page load.
- `POST /api/events/<event_id>/consent` — Public. Body: `{ player_id, consented }`. Upserts an `EventConsent` record, snapshots consent label text, captures client IP from `X-Forwarded-For` header (or `request.remote_addr` fallback).
- `POST /api/events` — Admin. Create new event.
- `GET /api/events` — Admin. List all events.

Register blueprint in `backend/app.py`.

### Modified: `backend/routes/scores.py`
`POST /api/scores` — Accept optional `event_id` and `started_at` (ISO timestamp) in body. Validate event exists if provided. Pass both to Score constructor.

### Modified: `backend/routes/leaderboard.py`
Both endpoints accept optional `?event_id=<uuid>` query param:
- If `event_id` provided → filter `Score.event_id == event_id`
- If not provided → filter `Score.event_id.is_(None)` (default scores only)

This keeps event scores completely isolated from the default leaderboard.

---

## Frontend Changes

### Routing (`frontend/src/main.tsx`)
Add two routes **after** all named routes (so `/leaderboard`, `/vibe`, `/admin` match first):
```
<Route path="/:eventSlug/leaderboard" element={<LeaderboardPage />} />
<Route path="/:eventSlug" element={<App />} />
```

### New context: `frontend/src/contexts/EventContext.tsx`
Follows the existing `ThemeContext.tsx` pattern:
- `EventProvider` takes `eventSlug` prop, fetches `GET /api/events/<slug>` on mount
- Exposes `useEvent()` hook returning `{ event, isLoading, error }`
- When no slug, `event` is `null` (default game, no changes)

### New types (`frontend/src/types.ts`)
```ts
type EventConsentConfig = { enabled: boolean; label: string; required: boolean };
type EventConfig = {
  id: string; slug: string; name: string; is_active: boolean;
  config: { subtitle?: string; consent?: EventConsentConfig; leaderboard_title?: string };
};
```

### Modified: `frontend/src/App.tsx`
1. Read `eventSlug` from `useParams()`, wrap in `EventProvider`
2. Use `useEvent()` to get event data
3. Record `started_at` timestamp (capture `new Date().toISOString()` when `handleStart` is called)
4. Pass `event_id` and `started_at` in score submission body (`handleGameComplete`)
5. Append `?event_id=` to leaderboard fetch URL (`fetchLeaderboard`)
6. Update `handleStart` signature to accept optional `consented` boolean
7. After player registration, call `POST /api/events/<event_id>/consent` (always for event games, passing consented value if checkbox was shown)

### Modified: `frontend/src/components/WelcomeScreen.tsx`
1. Use `useEvent()` — show event subtitle if present (e.g., "AI SUMMIT EDITION" instead of "DIGITALOCEAN EDITION")
2. Render consent checkbox when `event.config.consent.enabled` is true
3. Block form submission if `consent.required` and not checked
4. Pass `consented` to `onStart` callback (signature: `onStart(nickname, email, consented?)`)
5. Point leaderboard link to `/${event.slug}/leaderboard` when in event context

### Modified: `frontend/src/components/Leaderboard.tsx`
Accept optional `title` prop to override the default header text (used by event-scoped leaderboards).

### Modified: `frontend/src/pages/LeaderboardPage.tsx`
1. Read `eventSlug` from `useParams()`
2. If present, fetch event by slug to get `event.id`
3. Append `?event_id=` to leaderboard API calls
4. Pass event-specific title to `Leaderboard` component
5. "PLAY" button navigates to `/${eventSlug}` instead of `/`

---

## Implementation Order

1. **Backend models** — Add `Event`, `EventConsent` to `models.py`, add `event_id` to `Score`
2. **Backend routes** — Create `events.py`, modify `scores.py` and `leaderboard.py`, register blueprint
3. **Frontend types + context** — Add types, create `EventContext.tsx`
4. **Frontend routing** — Add `/:eventSlug` and `/:eventSlug/leaderboard` to `main.tsx`
5. **Frontend integration** — Modify `App.tsx`, `WelcomeScreen.tsx`, `Leaderboard.tsx`, `LeaderboardPage.tsx`

---

## Verification

1. Visit `/` — game works identically, no event context, leaderboard shows only default scores
2. Create a test event via `POST /api/events` with slug `test-event` and consent enabled
3. Visit `/test-event` — see custom subtitle, consent checkbox, play game
4. Confirm score is saved with `event_id` in DB
5. Confirm `/test-event/leaderboard` shows only that event's scores
6. Confirm `/leaderboard` does NOT show event scores
7. Confirm `EventConsent` record created with correct player and consent text
8. Visit `/nonexistent-slug` — shows error/redirect (event not found)
9. Verify reserved slugs (`leaderboard`, `vibe`, `admin`) route correctly to their pages, not the event handler

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `backend/models.py` | Add Event, EventConsent models; add event_id to Score |
| `backend/routes/events.py` | **New** — event CRUD + consent endpoint |
| `backend/routes/scores.py` | Accept optional event_id |
| `backend/routes/leaderboard.py` | Add event_id query param filtering |
| `backend/app.py` | Register events blueprint |
| `frontend/src/types.ts` | Add EventConfig, EventConsentConfig types |
| `frontend/src/contexts/EventContext.tsx` | **New** — event context provider |
| `frontend/src/main.tsx` | Add event slug routes |
| `frontend/src/App.tsx` | Integrate event context, pass event_id to APIs |
| `frontend/src/components/WelcomeScreen.tsx` | Dynamic subtitle, consent checkbox |
| `frontend/src/components/Leaderboard.tsx` | Optional title prop |
| `frontend/src/pages/LeaderboardPage.tsx` | Event-aware leaderboard fetching |
