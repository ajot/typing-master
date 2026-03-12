# Replace Nickname with First/Last Name

## Summary

Update the player registration flow to collect first name and last name instead of nickname. Display name on leaderboard and results as "FirstName L." format. Preserve the existing nickname column for legacy data.

## Data Model

### Player Model Changes

- Add `first_name` (String, max 50, nullable in DB, required at API level)
- Add `last_name` (String, max 50, nullable in DB, required at API level)
- Keep `nickname` column — no longer collected from users, auto-generated from name
- Add computed `display_name` property: `"FirstName L."` (first name + last initial + period)
- Legacy fallback: if `first_name` is null, use `nickname` as display name

### Database Migration (manual SQL)

```sql
ALTER TABLE players ADD COLUMN first_name VARCHAR(50);
ALTER TABLE players ADD COLUMN last_name VARCHAR(50);
```

No migration tool in use — `db.create_all()` handles new tables but not column additions on existing tables. Run the above on production manually.

## Backend Changes

### Player Model (`models.py`)

- Add `first_name` and `last_name` columns
- Add `display_name` property: returns `"FirstName L."` if first/last name exist, otherwise falls back to `nickname`
- Update `to_dict()` to include `first_name`, `last_name`, and `display_name`

### Registration Route (`routes/players.py`)

- POST `/api/players` accepts `first_name` and `last_name` instead of `nickname`
- Validate both fields as required, max 50 chars each
- Auto-generate `nickname` from name (e.g., `"Amit J."`) for backwards compatibility
- On re-registration (same email): update `first_name` and `last_name` if changed

### Leaderboard Routes (`routes/leaderboard.py`)

- Return `display_name` in leaderboard entries (uses first/last name with fallback to nickname)

### Admin Routes (`routes/admin.py`)

- Include `first_name`, `last_name` in player data and event player lists

## Frontend Changes

### TypeScript Types (`types.ts`)

- Add `first_name`, `last_name`, `display_name` to Player type

### WelcomeScreen (`components/WelcomeScreen.tsx`)

- Replace "ENTER YOUR HANDLE" nickname input with two fields:
  - "FIRST NAME" (required, max 50 chars)
  - "LAST NAME" (required, max 50 chars)
- Update `onStart` callback signature: `(firstName, lastName, email, consented?)`

### App.tsx

- Update `handleStart` to pass `first_name` and `last_name` to POST `/api/players`
- Store updated player object with new fields

### Leaderboard (`components/Leaderboard.tsx`)

- Display `display_name` instead of `nickname`
- Fallback handled server-side (legacy players return nickname as display_name)

### ResultsScreen (`components/ResultsScreen.tsx`)

- Display `display_name` instead of `nickname`

### AdminPage (`pages/AdminPage.tsx`)

- Show first name, last name columns in player tables
- Show in event player lists
- Fall back to nickname display for legacy players without names
