# Typing Master - Conference Booth Typing Game

## Overview
A retro 8-bit styled typing game for DigitalOcean conference booths. Attendees type DO-themed text to compete on a daily leaderboard.

---

## Tech Stack
| Component | Technology | Hosting |
|-----------|------------|---------|
| Frontend | React + TypeScript + Tailwind CSS | DO App Platform (Static Site) |
| Backend | Python/Flask + Gunicorn | DO App Platform (Web Service) |
| Database | PostgreSQL | DO Managed Database ($15/mo) |
| Text Prompts | Pre-generated DO-themed prompts | Stored in database |
| Sound FX | 8-bit audio (Howler.js) | Frontend |

---

## Directory Structure
```
typing-master/
├── frontend/                   # React application
│   ├── public/
│   │   ├── fonts/              # Pixel fonts (Press Start 2P)
│   │   └── sounds/             # 8-bit sound effects
│   │       ├── keypress.mp3
│   │       ├── error.mp3
│   │       ├── success.mp3
│   │       └── countdown.mp3
│   ├── src/
│   │   ├── components/
│   │   │   ├── WelcomeScreen.tsx
│   │   │   ├── TypingGame.tsx
│   │   │   ├── TextReveal.tsx  # Typing animation component
│   │   │   ├── ResultsScreen.tsx
│   │   │   ├── Leaderboard.tsx
│   │   │   ├── Countdown.tsx
│   │   │   └── RetroEffects.tsx
│   │   ├── hooks/
│   │   │   ├── useTypingGame.ts
│   │   │   ├── useTypewriter.ts # Hook for typing animation
│   │   │   └── useSound.ts     # Sound effects hook
│   │   ├── styles/
│   │   │   └── retro.css       # CRT effects, scanlines
│   │   ├── App.tsx
│   │   ├── index.tsx
│   │   └── types.ts
│   ├── package.json
│   ├── tailwind.config.js
│   └── tsconfig.json
├── backend/
│   ├── app.py                  # Flask application
│   ├── models.py               # SQLAlchemy models (Player, Prompt, Score)
│   ├── seed_prompts.py         # Script to seed initial prompts to DB
│   ├── routes/
│   │   ├── scores.py
│   │   ├── leaderboard.py
│   │   └── prompts.py          # Returns random prompt from DB
│   ├── requirements.txt
│   └── Dockerfile
└── .do/
    └── app.yaml                # App Platform deployment spec
```

---

## Database Schema

### players
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| nickname | VARCHAR(50) | Required |
| email | VARCHAR(255) | Required |
| created_at | TIMESTAMP | Auto |

### prompts
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| text | TEXT | The typing prompt text |
| category | VARCHAR(50) | e.g., "droplets", "kubernetes", "general" |
| difficulty | VARCHAR(20) | "easy", "medium", "hard" (for future use) |
| is_active | BOOLEAN | Enable/disable without deleting |
| times_used | INTEGER | Track usage count |
| created_at | TIMESTAMP | Auto |

### scores
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| player_id | UUID | Foreign key → players |
| prompt_id | UUID | Foreign key → prompts |
| wpm | INTEGER | Words per minute |
| accuracy | FLOAT | 0.0 - 1.0 |
| score | INTEGER | Calculated final score |
| created_at | TIMESTAMP | Auto |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/players` | Register player (nickname, email) |
| GET | `/api/prompts/random` | Get random active prompt from DB |
| POST | `/api/scores` | Submit score after game |
| GET | `/api/leaderboard` | Get today's top 10 scores |
| GET | `/api/prompts` | List all prompts (admin) |
| POST | `/api/prompts` | Add new prompt (admin) |
| PATCH | `/api/prompts/:id` | Update/disable prompt (admin) |

---

## Game Flow

```
┌─────────────────┐
│  Welcome Screen │
│  - Enter nickname│
│  - Enter email   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Get Ready!    │
│  Text "types    │
│  out" with      │
│  animation...   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Countdown     │
│   3... 2... 1...│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Typing Game    │
│  - 60 sec timer │
│  - Live WPM     │
│  - Live accuracy│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Results Screen │
│  - Final WPM    │
│  - Accuracy %   │
│  - Total Score  │
│  - Leaderboard  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Play Again?    │
└─────────────────┘
```

### Typing Animation (Text Reveal)
When the prompt loads, it will "type out" character by character like a chatbot:
- Fetch prompt from API
- Display characters one-by-one with ~30ms delay
- Blinking cursor at the end while typing
- Once complete, cursor disappears and countdown begins
- Creates anticipation and lets player read ahead

---

## Scoring Formula

```
Final Score = WPM × Accuracy Multiplier

Where:
- WPM = (Total Characters Typed / 5) / (Time in Minutes)
- Accuracy = Correct Keystrokes / Total Keystrokes
- Accuracy Multiplier = Accuracy × 100

Example:
- 60 WPM, 95% accuracy → 60 × 95 = 5,700 points
```

---

## Visual Design (Retro 8-bit)

### Colors
- Background: `#000000` (pure black)
- Primary: `#FF6B00` (DO orange)
- Success: `#00FF00` (green for correct)
- Error: `#FF0000` (red for mistakes)
- Text: `#FFFFFF` (white)
- Accent: `#00FFFF` (cyan for highlights)

### Effects
- CRT scanline overlay (CSS)
- Text glow/bloom effect
- Screen flicker on errors
- Pixel font (Press Start 2P from Google Fonts)
- Chunky bordered UI elements

### Sound Effects (8-bit style)
- Keypress: Soft click sound on each keystroke
- Error: Harsh buzzer on wrong key
- Success: Chime when word completed correctly
- Countdown: Beep for 3-2-1 countdown
- Game Over: Retro victory/completion jingle

---

## Implementation Order

### Phase 1: Project Setup
1. Initialize React app with TypeScript in `/frontend`
2. Initialize Flask app in `/backend`
3. Configure Tailwind with custom retro theme
4. Set up PostgreSQL database schema

**✓ Phase 1 Testing:**
- [ ] React app runs locally (`npm run dev`) - see welcome page
- [ ] Flask app runs locally (`flask run`) - see "Hello World" at `/api/health`
- [ ] Tailwind styles compile without errors
- [ ] Database tables created successfully (check via psql or pgAdmin)

---

### Phase 2: Backend API
5. Create Flask app structure with SQLAlchemy models
6. Seed pre-generated DO-themed typing prompts (20-30 variations)
7. Implement `/api/players` endpoint
8. Implement `/api/scores` endpoint
9. Implement `/api/leaderboard` endpoint
10. Implement `/api/prompts/random` endpoint

**✓ Phase 2 Testing:**
- [ ] `POST /api/players` - creates player, returns player ID
- [ ] `GET /api/prompts/random` - returns random prompt from DB
- [ ] `POST /api/scores` - saves score, returns score ID
- [ ] `GET /api/leaderboard` - returns today's top 10 scores
- [ ] Test with curl or Postman to verify all endpoints

---

### Phase 3: Frontend - Core Game
11. Create retro CSS styles (scanlines, glow, fonts)
12. Build WelcomeScreen component
13. Build TypingGame component with useTypingGame hook
14. Build TextReveal component with useTypewriter hook
15. Build ResultsScreen component
16. Build Leaderboard component

**✓ Phase 3 Testing:**
- [ ] WelcomeScreen renders with form inputs (nickname, email)
- [ ] TextReveal shows typewriter animation
- [ ] TypingGame tracks keystrokes, shows correct/incorrect highlighting
- [ ] Timer counts down from 60 seconds
- [ ] WPM and accuracy update in real-time
- [ ] ResultsScreen displays final score
- [ ] Leaderboard renders mock data
- [ ] All retro styles render correctly (fonts, colors, scanlines)

---

### Phase 4: Polish & Integration
17. Connect frontend to backend API
18. Add countdown animation (3...2...1...) before game starts
19. Add 8-bit sound effects (useSound hook + Howler.js)
20. Full end-to-end testing

**✓ Phase 4 Testing:**
- [ ] Player registration saves to database
- [ ] Random prompt loads from API
- [ ] Score submits to database after game
- [ ] Leaderboard shows real data from API
- [ ] Sound effects play on keypress, error, countdown, game over
- [ ] Complete a full game flow from welcome to leaderboard
- [ ] Test edge cases (empty inputs, rapid typing, network errors)

---

### Phase 5: Deployment
21. Create Dockerfile for backend
22. Create `.do/app.yaml` for App Platform
23. Deploy to DigitalOcean App Platform
24. Configure environment variables
25. Connect managed PostgreSQL database
26. Seed prompts to production database

**✓ Phase 5 Testing:**
- [ ] Backend container builds successfully
- [ ] App deploys without errors
- [ ] Frontend loads at production URL
- [ ] API endpoints work in production
- [ ] Database connection works
- [ ] Full game playable in production
- [ ] Leaderboard persists across sessions

---

## App Platform Configuration (`.do/app.yaml`)

```yaml
name: typing-master
region: nyc
services:
  - name: api
    source_dir: /backend
    dockerfile_path: backend/Dockerfile
    http_port: 8080
    instance_size_slug: basic-xxs
    instance_count: 1
    routes:
      - path: /api
    envs:
      - key: DATABASE_URL
        scope: RUN_TIME
        value: ${db.DATABASE_URL}

static_sites:
  - name: web
    source_dir: /frontend
    build_command: npm run build
    output_dir: dist
    routes:
      - path: /

databases:
  - name: db
    engine: PG
    production: true
```

---

## Sample Typing Prompts (DO-themed)

Examples of prompts to seed into the database:

1. "Droplets are scalable virtual machines that launch in seconds. Deploy your application on DigitalOcean and scale with confidence."

2. "Kubernetes simplifies container orchestration. DigitalOcean Kubernetes lets you deploy and manage containerized applications effortlessly."

3. "App Platform is a fully managed solution. Push your code and let DigitalOcean handle the infrastructure, scaling, and security."

4. "Managed databases remove operational burden. Focus on your application while DigitalOcean handles backups, updates, and failover."

5. "Spaces object storage is S3-compatible. Store and serve large amounts of data with built-in CDN for fast global delivery."

(20-30 total prompts will be created covering various DO products and cloud concepts)

---

## Key Files to Create

| Priority | File | Purpose |
|----------|------|---------|
| 1 | `backend/app.py` | Flask app entry point |
| 2 | `backend/models.py` | Database models (Player, Prompt, Score) |
| 3 | `backend/seed_prompts.py` | Seed initial DO prompts to database |
| 4 | `backend/requirements.txt` | Python dependencies |
| 5 | `backend/Dockerfile` | Container config |
| 6 | `frontend/package.json` | React + Howler.js dependencies |
| 7 | `frontend/tailwind.config.js` | Retro theme config |
| 8 | `frontend/src/styles/retro.css` | CRT effects, scanlines |
| 9 | `frontend/src/hooks/useTypingGame.ts` | Core game logic |
| 10 | `frontend/src/hooks/useTypewriter.ts` | Typing animation effect |
| 11 | `frontend/src/hooks/useSound.ts` | 8-bit sound effects |
| 12 | `frontend/src/components/TextReveal.tsx` | Animated text reveal |
| 13 | `frontend/src/components/TypingGame.tsx` | Main game UI |
| 14 | `frontend/src/components/Leaderboard.tsx` | Score display |
| 15 | `.do/app.yaml` | Deployment spec |

---

## Decisions Made

| Question | Decision |
|----------|----------|
| Stations | Single station |
| Game duration | 60 seconds |
| Leaderboard scope | Per-day, per-conference |
| Player info | Nickname + email |
| Difficulty | Single level |
| Prizes | None (just leaderboard) |
| Offline mode | Not needed (cloud-hosted) |
| Branding | DigitalOcean general |
| AI Text | Pre-generated prompts (no GenAI API) |
| Database | Managed PostgreSQL ($15/mo) |
| Sound effects | Yes, 8-bit style with Howler.js |
| Prompt storage | Database table (can add/edit without redeploy) |
| Text reveal | Typewriter animation before game starts |
