# Color Matching System

Textile dye concentration estimator based on MSc thesis research (Mehran Ghazi, Amirkabir University of Technology). Uses smartphone camera sRGB data, CIE XYZ/Lab values, or 31-point spectral reflectance curves to estimate cationic dye concentrations for color matching on acrylic fibers.

## Architecture

- **Backend**: FastAPI + PostgreSQL, ports the original MATLAB color-matching algorithms (Delaunay interpolation, nearest neighbor, Allen colorimetric matching)
- **Frontend**: React, served via nginx
- **Auth**: JWT-based user accounts with per-user match history

## Requirements

- Docker
- Docker Compose
- The database dump file `color_matching_dump.sql` (not included in this repo — see below)

## First-Time Setup

### 1. Create your `.env` file

```bash
cp .env.example .env
```

Edit `.env` and set your own values:
DB_USER=postgres

DB_PASSWORD=your_secure_password

DB_NAME=color_matching

JWT_SECRET_KEY=generate_a_random_secret_here
### 2. Get the database dump

`color_matching_dump.sql` contains all the thesis data (dyes, k/s values, ~142k lookup table entries, Munsell reflectance data) and is excluded from git due to size (~30MB).

If you don't have it, regenerate it from a local Postgres instance that already has the schema and data loaded:

```bash
pg_dump --no-owner --no-acl color_matching > color_matching_dump.sql
```

Place this file in the project root, next to `docker-compose.yml`.

### 3. Start everything

```bash
docker-compose up --build
```

This starts three services:
- `db` — PostgreSQL, auto-loads `color_matching_dump.sql` on first run (only on a fresh volume)
- `api` — FastAPI backend on port 8000
- `frontend` — React app served by nginx on port 80

### 4. Open the app
Register an account, then start matching colors.

## API Docs
## Resetting the Database

If you need to reload the dump (e.g. after schema changes):

```bash
docker-compose down -v   # removes the Postgres volume
docker-compose up --build
```

`-v` wipes the volume so the dump reloads from scratch on next startup.

## Project Structure
.

├── docker-compose.yml

├── Dockerfile.backend

├── Dockerfile.frontend

├── nginx.conf

├── requirements.txt

├── schema.sql              # table definitions only (committed)

├── color_matching_dump.sql # full data dump (gitignored, ~30MB)

├── src/api/                # FastAPI backend

│   ├── auth.py

│   ├── init_db.py

│   ├── main.py

│   ├── core/                # color math + matching algorithms

│   └── routers/              # /auth and /match endpoints

└── web-src/                 # React frontend

└── src/

├── components/       # GamutChart, SpectralInput

├── context/          # AuthContext, HistoryContext

├── pages/             # MatchPage, HistoryPage, LoginPage, RegisterPage

└── services/api.js
## Features

- **Three input methods**: smartphone photo, manual XYZ entry, or 31-point spectral reflectance curve
- **Two matching methods**: Delaunay interpolation (preferred, inside gamut) and nearest neighbor (fallback)
- **Automatic combination selection**: tries all 8 binary and 4 ternary dye combinations, returns the best match
- **Gamut visualization**: CIE 1931 chromaticity diagram with spectrum locus, or L\*a\*b\* a\*b\* plane
- **User accounts**: JWT auth with per-user match history
