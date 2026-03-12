# Replace Nickname with First/Last Name

## Summary

Update the player registration flow to collect first name and last name instead of nickname. Display name on leaderboard and results as "FirstName L." format. Preserve the existing nickname column for legacy data.

## Data Model

### Player Model Changes

- Add `first_name` (String, max 50, nullable in DB, required at API level)
- Add `last_name` (String, max 50, nullable in DB, required at API level)
- Keep `nickname` column as `NOT NULL` — no longer collected from users, auto-generated from name (e.g., `"Amit J."`)
- Nickname uniqueness is not guaranteed (two "Alice J." players can coexist) — acceptable since `display_name` is the public-facing field
- Add computed `display_name` `@property`: `"FirstName L."` (first name + space + last initial + period)
- Legacy fallback: if `first_name` is null/empty, `display_name` returns `nickname`
- Backend validation must reject empty strings (after stripping whitespace), not just null/missing

### Database Migration (manual SQL)

```sql
ALTER TABLE players ADD COLUMN first_name VARCHAR(50);
ALTER TABLE players ADD COLUMN last_name VARCHAR(50);
```

No migration tool in use — `db.create_all()` handles new tables but not column additions on existing tables. Run the above on production manually.

## Backend Changes

### Player Model (`models.py`)

- Add `first_name` and `last_name` columns (nullable at DB level)
- Add `display_name` `@property`: returns `"FirstName L."` if first/last name are non-empty, otherwise falls back to `nickname`
- Update `to_dict()` to include `first_name`, `last_name`, and `display_name`
- `Score.to_dict()` already embeds `player.to_dict()` — new fields propagate automatically

### Registration Route (`routes/players.py`)

- POST `/api/players` accepts `first_name` and `last_name` instead of `nickname`
- Validate both fields: required, non-empty after strip, max 50 chars each
- Auto-generate `nickname` from name (e.g., `"Amit J."`) for backwards compatibility
- On re-registration (same email): independently check and update `first_name` and `last_name` (do not infer changes from nickname equality)

### Leaderboard Routes (`routes/leaderboard.py`)

- Add `display_name` key to leaderboard response JSON (alongside existing `nickname` key for backwards compatibility)
- Frontend will read `display_name` instead of `nickname`

### Admin Routes (`routes/admin.py`)

- `get_stats` query (column-level query): add `Player.first_name`, `Player.last_name` as explicit select columns
- `get_event_players` query (column-level query): add `Player.first_name`, `Player.last_name` as explicit select columns and include in response dict
- Both queries must be updated since they bypass `to_dict()`

## Frontend Changes

### TypeScript Types (`types.ts`)

- Add `first_name`, `last_name`, `display_name` to `Player` type
- Add `display_name` to `LeaderboardEntry` type (keep `nickname` for backwards compatibility)

### WelcomeScreen (`components/WelcomeScreen.tsx`)

- Replace "ENTER YOUR HANDLE" nickname input with two fields:
  - "FIRST NAME" (required, max 50 chars, `autoFocus`)
  - "LAST NAME" (required, max 50 chars)
- Update `WelcomeScreenProps.onStart` type: `(firstName: string, lastName: string, email: string, consented?: boolean) => void`
- Update `errors` state type: replace `nickname` key with `firstName` and `lastName` keys

### App.tsx

- Update `handleStart` to accept `firstName, lastName` and pass `first_name`, `last_name` to POST `/api/players`
- Store updated player object with new fields
- Pass `player.display_name` (not `player.nickname`) to `ResultsScreen`

### Leaderboard (`components/Leaderboard.tsx`)

- Display `entry.display_name` instead of `entry.nickname`
- Fallback handled server-side (legacy players return nickname as display_name)

### ResultsScreen (`components/ResultsScreen.tsx`)

- Rename `nickname` prop to `displayName`
- Display `displayName` instead of `nickname`
- Update AI message API call body to use `displayName` value

### AdminPage (`pages/AdminPage.tsx`)

- Show first name, last name columns in player tables
- Show in event player lists
- Fall back to display_name for legacy players without name fields
