# AI Threat Detection Platform

An AI-assisted web threat detection and monitoring platform for analysing Nginx access logs. The project combines rule-based inspection with machine-learning anomaly scoring and presents detected activity in a React operations console.

> **Project scope:** This is a defensive, self-hosted learning and portfolio project. It analyses logs from systems you own or are authorised to monitor. It is not a production-ready managed security service. Validate detection quality, access controls, secrets, and deployment hardening before exposing it to the internet.

## What it does

- Ingests Nginx access-log events through the backend pipeline.
- Extracts request and behavioural features for analysis.
- Applies detection rules and available ML models to identify suspicious HTTP activity.
- Stores threat events in PostgreSQL and uses Redis for alert delivery.
- Streams alerts to the web console over WebSockets.
- Provides dashboard, threat investigation, and model-status views.
- Includes a local traffic simulator for generating safe test events against the bundled test target.

## Interface

The console includes:

| Area | Purpose |
|---|---|
| Dashboard | Detection totals, severity distribution, top source IPs, targeted paths, and alert feed |
| Threats | Filterable and paginated event list with event details |
| Models | Model availability, metadata/metrics, and retraining action |
| API | Health/readiness, statistics, threat, ingestion, model, and WebSocket endpoints |

Screenshots captured from a verified local run belong in [`docs/screenshots/`](docs/screenshots/). Do not add mock screenshots or claim a service is live when it is not.

## Architecture

```text
Nginx access log
      |
      v
Log tailer -> parser -> feature extraction -> rule + ML scoring
                                             |
                                             v
                                  PostgreSQL event store
                                             |
                                             v
                                     Redis pub/sub
                                             |
                                             v
                                  WebSocket alert feed
                                             |
                                             v
                                  React operations console
```

### Detection flow

1. **Ingestion** reads and parses Nginx access-log entries.
2. **Feature extraction** creates request-level and aggregate features.
3. **Detection** combines configured signatures/rules with ML scoring when model assets are available.
4. **Enrichment** can add GeoIP context when a compatible MaxMind database is configured.
5. **Alerting** persists qualifying events and publishes updates to connected dashboard clients.

ML scores are indicators for analyst review, not proof that a request is malicious. Thresholds and false-positive rates must be evaluated using representative traffic.

## Technology stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite, Sass, TanStack Query, Zustand |
| API | Python, FastAPI, Pydantic, SQLAlchemy |
| Storage / messaging | PostgreSQL, Redis |
| Detection | Python rules, ONNX Runtime; optional PyTorch / scikit-learn training dependencies |
| Operations | Docker Compose, Nginx, Alembic |

## Run locally

**Localhost is the recommended first deployment target.** Use it to verify the full stack and generate genuine screenshots before publishing. Docker Desktop with Docker Compose v2 is the repository's documented path; Git is also required.

1. Clone the repository and enter its root directory:

   ```powershell
   git clone https://github.com/<your-username>/ai-threat-detection-platform.git
   cd ai-threat-detection-platform
   ```

2. Create the local environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Edit `.env` and replace development credentials, especially `API_KEY` and `POSTGRES_PASSWORD`. Keep `.env` private and never commit it.

4. Start the development stack:

   ```powershell
   docker compose -f dev.compose.yml up --build
   ```

5. Open the services:

   | Service | Local address |
   |---|---|
   | Web console | http://localhost:46969 |
   | Backend API | http://localhost:36969 |
   | Health check | http://localhost:36969/health |
   | Readiness | http://localhost:36969/ready |
   | API documentation | http://localhost:36969/docs |

   First startup can take several minutes while containers build and dependencies initialise. Inspect logs with `docker compose -f dev.compose.yml logs -f`.

6. Stop the stack:

   ```powershell
   docker compose -f dev.compose.yml down
   ```

   To also remove local database/cache volumes (this permanently deletes local lab data):

   ```powershell
   docker compose -f dev.compose.yml down -v
   ```

### Generate test traffic

Start the bundled disposable Nginx target in a second terminal:

```powershell
docker compose -f dev-log/compose.yml up -d --build
```

From the repository root, generate a mixed test profile:

```powershell
python dev-log/simulate.py mixed -n 100
```

Other profiles include `normal`, `sqli`, `xss`, `traversal`, `cmdi`, `log4shell`, `ssrf`, `xxe`, `scanner`, and `flood`. The simulator is intended for the bundled local target only. Do not direct it at third-party systems.

Stop the test target when finished:

```powershell
docker compose -f dev-log/compose.yml down
```

## API overview

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | Process liveness and pipeline counters |
| `GET` | `/ready` | Dependency/model readiness checks |
| `GET` | `/stats` | Detection totals and severity breakdown |
| `GET` | `/threats` | Paginated threat events and filters |
| `GET` | `/threats/{threat_id}` | Retrieve one event |
| `GET` | `/models/status` | Active model status and metrics |
| `POST` | `/models/retrain` | Request model retraining |
| `POST` | `/ingest/batch` | Submit raw log lines to ingestion |
| `WS` | `/ws/alerts` | Stream alert events |

Protected HTTP endpoints use the `X-API-Key` header. Refer to the running API docs for exact request and response schemas.

## If Docker is not installed

Docker is optional; it is only the easiest way to start the complete development stack because this project uses several services. You have two alternatives:

1. **Install Docker Desktop (recommended for local development):** after installation, restart PowerShell and verify with `docker --version` and `docker compose version`. Then follow the local setup above.
2. **Run services natively on Windows:** install a supported Python version, Node.js, PostgreSQL, and Redis separately; configure the backend environment variables and database; start the FastAPI backend and Vite frontend in separate terminals. This is more manual, and the log-ingestion component also needs a readable Nginx access-log file. The exact commands depend on the installed Python/package manager and database configuration, so do not assume the Compose command works without Docker.

**Cloud is a separate option, not a replacement for localhost during development.** You can deploy the frontend and backend from GitHub to a cloud platform and use managed PostgreSQL/Redis. However, this project also tails Nginx logs, so a public demo needs a safe log source or demo-event ingestion path; a basic static-site deployment will not run the full detection pipeline. The production Compose file in this repository requires adaptation and is not a one-click cloud template.

## Cloud hosting: recommended approach

For a portfolio project, **do not replace local development with cloud hosting**. Keep localhost as the reliable development/test environment, then publish a separate cloud demo after verification.

This repository has multiple stateful services (API, PostgreSQL, Redis, model files, and log ingestion). A static frontend host alone will not provide a working end-to-end demo. A cloud deployment needs:

- A persistent backend service/container and a reachable frontend.
- Managed PostgreSQL and Redis, or secured persistent services on a VPS.
- Environment-based secrets (never hard-coded credentials or committed `.env`).
- HTTPS, restricted database/cache access, API authentication, backups, and resource limits.
- A safe demo data source. Do not expose private server logs or the traffic simulator to public targets.

**Practical portfolio route:** first run the complete stack locally and capture real screenshots. If you later want a live interactive demo, deploy the complete stack to a small VPS using Docker Compose, persistent volumes, a reverse proxy with TLS, and non-default secrets. The included `compose.yml` is infrastructure-specific: it references external networks/volumes and GeoIP credentials, so it must be adapted and reviewed before use on a new host. Do not assume it is a one-click cloud deployment.

If hosting cost or maintenance is a concern, publish the GitHub repository and verified screenshots first; add a live demo only after the full backend is securely deployed. A localhost URL is not accessible to recruiters from their own devices.

## Repository structure

```text
.
├── backend/             # FastAPI API, detection pipeline, ML and tests
├── frontend/            # React/TypeScript operations console
├── dev-log/             # Disposable local target and traffic simulator
├── infra/               # Container and Nginx configuration
├── learn/               # Concepts, architecture and implementation notes
├── data/                # Local data directory
├── docs/screenshots/    # Verified application screenshots
├── dev.compose.yml      # Local development stack
└── compose.yml          # Deployment-oriented stack (requires adaptation)
```

## Publish to GitHub

1. Create a new **empty** GitHub repository named `ai-threat-detection-platform` (do not initialise it with another README or licence).
2. Open PowerShell in the extracted project root (the folder containing this README).
3. Run:

   ```powershell
   git init
   git add .
   git commit -m "Initial release: AI Threat Detection Platform"
   git branch -M main
   git remote add origin https://github.com/<your-username>/ai-threat-detection-platform.git
   git push -u origin main
   ```

   Replace `<your-username>` with your GitHub username. If `origin` already exists, use `git remote set-url origin https://github.com/<your-username>/ai-threat-detection-platform.git` instead of adding it again.

4. On GitHub, verify the README, backend, frontend, docs, and configuration files are present. Never upload `.env`, credentials, private logs, database files, or local virtual environments.

## Development checks

Frontend (from `frontend/`):

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
pnpm lint
```

Backend (from `backend/`, using a Python version supported by the project metadata):

```bash
python -m pip install -e ".[dev,ml]"
pytest
```

Run these checks in your own environment before describing a release as verified. The documented Docker workflow is the simplest way to bring up all dependent services together.

## Security notes

- Never commit `.env`, API keys, database credentials, private logs, or real customer traffic.
- Change all development credentials before any network exposure.
- Keep PostgreSQL and Redis private; do not publish their ports to the public internet.
- Use TLS, secret management, backups, monitoring, and hardened container settings for a cloud deployment.
- Treat detections and ML scores as analyst decision support. Measure false positives and false negatives before operational use.
- GeoIP enrichment requires a separately obtained MaxMind GeoLite2 database and appropriate account/licence details.

## Attribution and licence

This repository includes third-party-derived source/assets. Preserve the original copyright notices and the GNU Affero General Public License v3.0 terms in `LICENSE`. Review upstream attribution and licence obligations before redistributing modified versions. The project name and presentation have been adapted for this repository; renaming does not remove third-party licence requirements.
