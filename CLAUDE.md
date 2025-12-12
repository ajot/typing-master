# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Type the Cloud" - A retro 8-bit styled typing game with React frontend, Flask backend, and PostgreSQL database. Deployed on DigitalOcean App Platform.

## Development Commands

### Frontend (React + TypeScript + Vite)
```bash
cd frontend
npm install
npm run dev      # Dev server at http://localhost:5173 (proxies /api to backend)
npm run build    # Production build → dist/
npm run lint     # ESLint checks
```

### Backend (Flask + Python)
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python seed_prompts.py   # Populate database with typing prompts
python app.py            # Dev server at http://localhost:8080
```

### Docker (Production)
```bash
docker build -t typing-master .
docker run -e DATABASE_URL=... -p 8080:8080 typing-master
```

## Architecture

### Frontend (`/frontend`)
- **Framework**: React 19 with TypeScript (strict mode), Vite, Tailwind CSS
- **State**: React hooks + Context (ThemeProvider for orange/blue themes)
- **Routing**: React Router (`/`, `/leaderboard`, `/admin` dev-only)
- **Key Hooks**:
  - `useTypingGame` - Game state, keystroke tracking, WPM/accuracy calculation
  - `useTypewriter` - Character-by-character text reveal animation
  - `useSound` - 8-bit audio effects (keypress, error, countdown, gameOver)

### Backend (`/backend`)
- **Framework**: Flask with blueprints, SQLAlchemy ORM, Gunicorn (prod)
- **Routes** (`/routes/`):
  - `players.py` - Player registration (nickname + email)
  - `prompts.py` - Prompt CRUD + random selection
  - `scores.py` - Score submission
  - `leaderboard.py` - Daily top 10 + all-time best per player
  - `admin.py` - Player management, email classification (dev-only)
- **Models**: Player, Prompt, Score (UUID primary keys)
- **SPA Support**: Serves React dist with fallback routing to index.html

### Data Flow
```
Welcome → Register Player → Fetch Random Prompt → Text Reveal Animation
→ Countdown (3-2-1) → 60-second Typing Game → Submit Score → Results
→ View Leaderboard → Play Again
```

## Game Mechanics

**Scoring Formula**: `Final Score = WPM × Accuracy × 100`
- WPM = (Correct Characters / 5) / Minutes
- Accuracy = Correct Keystrokes / Total Keystrokes (0.0-1.0)
- Game duration: 60 seconds

## Environment Variables

### Backend (`.env`)
```
DATABASE_URL=postgresql://...      # PostgreSQL connection
SECRET_KEY=...                     # Flask session secret
FLASK_ENV=development              # Enables debug + admin routes
ENABLE_ADMIN=true                  # Alternative admin toggle
```

### Frontend
```
VITE_API_URL=http://localhost:8080  # API base URL (dev only, prod uses relative)
```

## Deployment

- **Platform**: DigitalOcean App Platform
- **Config**: `.do/app.yaml`
- **Trigger**: Auto-deploy on push to `main` branch
- **Build**: Single Dockerfile (multi-stage: frontend build → backend serve)

## Code Style

- TypeScript strict mode, ESLint compliance required
- Functional React components with hooks
- Flask blueprints for route organization
- Retro 8-bit visual theme (Press Start 2P font, scanlines, glow effects)
- Colors: black background, DO orange (`#FF6B00`) primary, cyan/green accents
