# Portfolio Server (Backend)

Node.js + TypeScript + Express backend for the portfolio website.
It exposes REST endpoints for portfolio data, serves images/icons with caching
headers and provides an e-mail contact service (with captcha verification).

## Architecture (layers)

```
Controller / REST-Endpunkte   -> src/controllers, src/routes
Service-Layer (Datenabfrage)  -> src/services/portfolioService.ts
Service-Layer (E-Mail)        -> src/services/emailService.ts, captchaService.ts
Daten-Layer (Datenaufbereitung, read-only) -> src/data/*
Datenbank (JSON) + Bilder     -> data/ (host-provided, NOT in git)
```

## Requirements

- Node.js >= 20 (recommended: 22, see repo root `.nvmrc`)

## Setup

```bash
cd server
cp .env.example .env      # adjust if needed
npm install
```

### Data directory

The server reads the database and images from a data directory, resolved in this
order:

1. `DATA_DIR` from `.env` (if set)
2. `../harness/assets` (local development — the host data lives here)
3. `./data` (ships with `database.example.json`)

The real host data (`harness/assets/**`) is **never** committed. For local
development the auto-detection uses it directly. For an isolated run, leave
`DATA_DIR` empty and the bundled `database.example.json` is used.

## Scripts

```bash
npm run dev        # start with hot reload (tsx) on http://localhost:3001
npm run build      # compile TypeScript to dist/
npm start          # run the compiled server (dist/index.js)
npm run typecheck  # type-check without emitting
npm test           # run unit tests (vitest)
```

## Endpoints

| Method | Path                       | Description                          |
| ------ | -------------------------- | ------------------------------------ |
| GET    | `/api/health`              | Health check                         |
| GET    | `/api/portfolio`           | Full aggregated portfolio            |
| GET    | `/api/portfolio/about`     | About / Lebensweg                    |
| GET    | `/api/portfolio/experience`| Job experience                       |
| GET    | `/api/portfolio/education` | Education                            |
| GET    | `/api/portfolio/projects`  | Projects                             |
| GET    | `/api/portfolio/social`    | Social-media links                   |
| GET    | `/api/images/:name`        | Image/icon (cached, 6h)              |
| POST   | `/api/contact`             | Contact form -> e-mail (captcha)     |

## Docker (Raspberry Pi deployment)

```bash
docker build -t portfolio-server .
docker run -p 3001:3001 -v "$(pwd)/data:/app/data:ro" portfolio-server
```

The image is intended to run behind Nginx (reverse proxy) and a Cloudflared
tunnel on the Raspberry Pi 5, as described in `harness/AGENT.md`.
