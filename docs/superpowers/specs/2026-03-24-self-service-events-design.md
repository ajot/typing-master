# Self-Service Event Management — Design Spec

## Overview

Add organizer accounts with magic link authentication so conference organizers and booth leads can create and manage their own typing competition events, view player data, export CSVs, and manage custom prompts — without needing admin access.

The homepage game remains free for anyone. Event management requires a paid organizer account (manually activated for now, Stripe later).

## Goals

- Conference organizers can self-manage events end-to-end
- Clean separation: players play, organizers manage, super-admin oversees
- Freemium model: free game on homepage, paid event management
- Pave the way for future monetization via Stripe

## Non-Goals (for now)

- Stripe integration (manual activation for now)
- Resend email integration (magic links printed to console/logs for now)
- Landing page redesign (homepage stays as the game)
- Organizer plan tiers (all organizers are paid, no free tier)

---

## Data Model

### New: `Organizer`

| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| email | String(255), unique, indexed | |
| name | String(100) | Display name |
| is_active | Boolean, default false | Manually activated after payment |
| auth_token_hash | String(255), nullable | Hashed magic link token |
| auth_token_expires_at | DateTime, nullable | 15-minute expiry |
| session_token_hash | String(255), nullable | Hashed session token |
| session_expires_at | DateTime, nullable | 30-day rolling expiry, checked on each request |
| created_at | DateTime | |

Tokens are stored as SHA-256 hashes, not plaintext. The raw token is only sent to the organizer via magic link or set in the cookie.

### Modified: `Event`

| Column | Change |
|---|---|
| organizer_id | New FK to `organizers.id`, nullable (existing events have no organizer) |
| starts_at | New DateTime, nullable (optional scheduled activation) |
| ends_at | New DateTime, nullable (optional scheduled deactivation) |

### Modified: `Prompt`

| Column | Change |
|---|---|
| event_id | New FK to `events.id`, nullable, `SET NULL` on delete (null = global/shared prompt, non-null = custom prompt for that event) |

### Unchanged

`Player`, `Score`, `EventConsent` — no changes needed. Players and organizers are completely separate entities (different tables, no shared auth).

---

## Authentication

### Magic Link Flow

1. Organizer goes to `/login`, enters email
2. Backend looks up Organizer record. Returns a **generic success message** regardless of whether the email exists (prevents email enumeration): "If an account exists for that email, a magic link has been sent."
3. If organizer exists: generates random token, stores SHA-256 hash with 15-minute expiry. Rate limited to 3 requests per email per 15 minutes.
4. Magic link printed to console/logs (Resend integration later)
5. Organizer clicks link: `/login/verify?token=<token>`. Frontend immediately POSTs the token to `POST /api/auth/verify` (avoids token leaking in browser history/referrer headers).
6. Backend hashes the token, matches against stored hash, validates expiry. Generates session token, stores its hash, sets raw token as HTTP-only cookie.
7. Redirect to `/dashboard`

### Account Creation

No separate signup. `/login` page shows "Host your own typing competition — contact us to get started" with a contact email, plus a login form for existing organizers.

Organizer records are created by the super-admin via admin API routes. `is_active` is set to `true` after payment is confirmed. If an organizer logs in but `is_active` is `false`, they see "Your account is pending activation."

### Session Management

- Session token hash stored in DB, raw token in HTTP-only cookie
- Sessions expire after 30 days. `session_expires_at` column checked on each request.
- Logout clears cookie and nulls `session_token_hash` on the record

---

## Backend Routes

### Auth (`/api/auth/`)

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | Send magic link (generic response regardless of email existence). Rate limited: 3 per email per 15 min. |
| POST | `/api/auth/verify` | Verify magic link token (POST, not GET), set session cookie, return redirect URL |
| POST | `/api/auth/logout` | Clear session |

### Organizer Dashboard (`/api/dashboard/`)

All routes require session cookie. All event routes verify the organizer owns the event.

| Method | Path | Description |
|---|---|---|
| GET | `/api/dashboard/me` | Current organizer profile |
| GET | `/api/dashboard/events` | List organizer's events |
| POST | `/api/dashboard/events` | Create event (validates reserved slugs) |
| GET | `/api/dashboard/events/:id` | Event detail + stats |
| PATCH | `/api/dashboard/events/:id` | Update event settings |
| DELETE | `/api/dashboard/events/:id` | Delete event (see Event Deletion below) |
| GET | `/api/dashboard/events/:id/players` | Player list |
| GET | `/api/dashboard/events/:id/players/export` | CSV export |
| GET | `/api/dashboard/events/:id/leaderboard` | Event leaderboard |
| GET | `/api/dashboard/events/:id/prompts` | List custom prompts |
| POST | `/api/dashboard/events/:id/prompts` | Create custom prompt |
| PATCH | `/api/dashboard/events/:id/prompts/:promptId` | Update prompt |
| DELETE | `/api/dashboard/events/:id/prompts/:promptId` | Delete prompt |

### Super-Admin Organizer Management (`/api/admin/`)

| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/organizers` | List all organizers |
| POST | `/api/admin/organizers` | Create organizer (email + name) |
| PATCH | `/api/admin/organizers/:id` | Update organizer (activate/deactivate) |
| DELETE | `/api/admin/organizers/:id` | Delete organizer |

### Modified: Prompt Random Selection

| Method | Path | Change |
|---|---|---|
| GET | `/api/prompts/random` | Add optional `event_id` query param. If provided and the event has custom prompts, return one of those. Otherwise fall back to global prompts. |

### Modified: Existing Prompt CRUD Routes

The existing `/api/prompts` POST, PATCH, DELETE routes are currently unprotected. As part of this work, gate them behind the same env-var admin check used by other admin routes (`FLASK_ENV=development` or `ENABLE_ADMIN=true`). GET routes remain public.

### Existing Routes — Unchanged

- `/api/admin/stats`, `/api/admin/analyze-emails`, `/api/admin/events/:id/players` — super-admin panel
- `/api/events/<slug>` — public event lookup
- `/api/events/<event_id>/consent` — player consent recording
- All player, score, leaderboard routes

---

## Frontend

### New Pages — Dashboard (clean/professional theme)

| Path | Description |
|---|---|
| `/login` | Email input + magic link flow. "Contact us" messaging for new organizers. |
| `/login/verify` | Receives magic link token from URL, POSTs to `/api/auth/verify` |
| `/dashboard` | Event list with summary stats, create event button |
| `/dashboard/events/:eventId` | Event detail with tabs: Leaderboard, Players, Prompts, Settings |

### New Pages — Public (retro theme)

| Path | Description |
|---|---|
| `/pricing` | Simple comparison: free homepage game vs paid event management |

### Modified Pages

| Page | Change |
|---|---|
| All game pages | Slim top bar with "Pricing" and "Host an Event" links |
| Results screen | "Want this at your event?" CTA after game ends |

### Existing Pages — Unchanged

| Path | Description |
|---|---|
| `/` | Homepage game (free, no account needed) |
| `/:slug` | Event game |
| `/leaderboard` | Public leaderboard |
| `/admin` | Super-admin panel (env-var gated) |

### Routing Constraint

All named routes (`/login`, `/dashboard`, `/pricing`, `/leaderboard`, `/admin`) must be declared **before** the `/:slug` catch-all in the router, or React Router will match them as event slugs.

### Dashboard Design Direction

- Clean white/light gray background
- System font stack (not Press Start 2P)
- Minimal color palette — neutral grays, one accent color for CTAs
- Simple tables, clean cards for stats
- No scanlines, glow effects, or pixel art
- Reference: Stripe dashboard, Linear, Plausible Analytics — functional and understated
- Completely separate layout from the retro game theme

### Event Leaderboard Visibility

- **Public**: anyone can view an event's leaderboard by playing at `/:slug`
- **Dashboard**: organizer sees the same data plus extra context (player emails, consent status, etc.)

---

## URL Routing & Reserved Slugs

Events use clean URLs at `/:slug`. To prevent collisions with app routes, slugs are validated against all currently defined top-level frontend routes. The reserved list is maintained alongside the router — any new top-level route automatically becomes reserved.

Initial reserved slugs:
```
admin, dashboard, login, signup, pricing, leaderboard, api, static, health, about, terms, privacy, vibe, play
```

Validation happens:
- **Frontend**: disable submit if slug matches reserved list
- **Backend**: reject with 400 (source of truth)

---

## Event Prompt Selection Logic

- The existing `/api/prompts/random` endpoint gains an optional `event_id` query parameter
- If `event_id` is provided and the event has custom prompts (active prompts where `prompt.event_id == event_id`), return a random one from those
- If `event_id` is provided but the event has no custom prompts, fall back to the global pool (prompts where `event_id IS NULL`)
- If no `event_id` is provided (homepage game), use the global pool
- The frontend passes `event_id` when fetching a prompt during an event game

---

## Event Date Enforcement

- `starts_at` and `ends_at` are **informational for the organizer** in this phase — displayed on the dashboard settings tab
- The public `GET /api/events/<slug>` endpoint checks: if `starts_at` is set and in the future, or `ends_at` is set and in the past, the event is treated as inactive (returns 404)
- Organizers can also manually toggle `is_active` regardless of dates
- An event is accessible when: `is_active == True` AND (no `starts_at` or `starts_at <= now`) AND (no `ends_at` or `ends_at > now`)

---

## Event Deletion Behavior

When an organizer deletes an event, the delete handler performs cleanup at the **application level** (not DB-level cascades) to keep behavior explicit:

1. Custom prompts: delete all prompts where `event_id` matches (custom prompts are not useful without their event)
2. Event consents: delete all consent records for the event
3. Scores: set `event_id` to `NULL` — scores are preserved but no longer tied to the event (player history is not lost)
4. The event record is deleted

All four steps run in a single transaction.

The organizer sees a confirmation dialog: "This will permanently delete the event and its consent records. Player scores will be preserved. This cannot be undone."

---

## Existing Events Migration

Existing events (created before this feature, with no organizer) remain accessible via the super-admin panel. They are not visible in any organizer's dashboard. The super-admin can optionally assign an `organizer_id` to existing events via the admin panel to transfer ownership.

---

## CORS Note

Dashboard routes use HTTP-only cookies for auth. Frontend dashboard fetch calls must use `credentials: 'include'`. The backend CORS config must specify allowed origins explicitly (not `*`) when credentials are involved.

---

## Future Work (not in this spec)

- **Stripe integration** — self-service payment, auto-activation
- **Resend email integration** — real magic link emails
- **Custom branding** — organizer logo, colors on the game page
- **Landing page** — dedicated marketing page at `/`
- **Organizer plan tiers** — free tier with limited features
- **Pagination** — dashboard player/leaderboard endpoints for large events
- **Token hashing for session** — consider upgrading to bcrypt if needed
