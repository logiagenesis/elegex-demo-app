# Phase 3: Corporate Hardening and Portability Evidence

This document records the exact changes made to satisfy the corporate Python/backend engineering review standard, proving that the repository is now a portable, secure, and rigorously structured deliverable.

## 1. Governance and Supply Chain (P0)

- **License Protection:** The `LICENSE` file was changed from MIT to a strict proprietary "All Rights Reserved" license to protect the intellectual property.
- **Dependency Pinning:** The problematic `pnpm.overrides` block was migrated to a standard `resolutions` block, ensuring clean, warning-free deterministic installs on `pnpm v10`.
- **Security Posture:** Added `CODEOWNERS`, `dependabot.yml`, and `codeql.yml` to automate vulnerability tracking and enforce PR reviews.

## 2. Runtime Safety and Portability (P0)

- **Environment Validation:** `server/_core/env.ts` now actively calls `process.exit(1)` in production if required variables (like `DATABASE_URL` or `JWT_SECRET`) are missing, preventing the app from booting in an insecure state.
- **Graceful Shutdown:** Implemented `SIGTERM`/`SIGINT` handlers in `server/_core/index.ts` to stop accepting new connections, halt background workers, and safely close the MySQL connection pool before exiting.
- **Dockerization:** Added a multi-stage `Dockerfile` and a `docker-compose.yml` that bundles the application with a health-checked MariaDB container. The `README-deployment.md` now documents exactly how to run the stack anywhere.

## 3. HTTP Security and Observability (P1)

- **Structured Logging:** Replaced `console.log` with `pino` and `pino-http`, ensuring all API requests and server events emit structured, machine-readable JSON logs in production.
- **Perimeter Defense:** Added `helmet` for strict Content Security Policy (CSP) headers and `express-rate-limit` to protect against brute-force attacks (with a stricter limit on the `/api/oauth` endpoints).
- **Payload Limits:** Enforced a strict 1MB JSON payload limit on Express body parsers to prevent memory exhaustion attacks.

## 4. Background Worker Hardening (P1)

- **Atomic Claims:** The outbox worker (`server/connectors/worker.ts`) now uses a compare-and-swap atomic update (`affectedRows === 0`) to claim pending events. This prevents race conditions if multiple worker instances run simultaneously.
- **Explicit Boundary:** The worker is now disabled by default. It requires an explicit `OUTBOX_WORKER_ENABLED=true` environment variable to run, preventing simulated webhook delivery from polluting production logs unless intentionally activated.

## 5. Codebase Modularity (P2)

- **Frontend Split:** The oversized `ElegexPages.tsx` (2,800+ lines) was successfully split. The `DashboardHome` and `RecordsPage` components were extracted into their own files in `client/src/pages/elegex/`, demonstrating a scalable pattern for the remaining routes.
- **External API:** Created a new versioned integration API (`server/routers/api/v1.ts`) secured by an `API_MASTER_KEY` bearer token. It exposes `/api/v1/jobs/list` and `/api/v1/clients/list` for external Python/Celery scripts to consume safely.

## 6. South African Locale Alignment (P2)

- **Schema Cents:** Annotated the `callOutTypes` and `quoteItems` financial columns in `drizzle/schema.ts` to explicitly state they store ZAR cents, adhering to standard financial precision rules.
- **Default Locale:** Updated the application defaults in `organizationFormat.ts` and the demonstration seed script (`seed-demo.mjs`) to use `Africa/Johannesburg` and `en-ZA` instead of UTC.

## Remaining Production Boundaries

While the codebase now passes strict CI quality gates and implements corporate-grade HTTP security, the following elements remain explicitly out of scope for this synthetic demonstration:

1. **Real Webhook Dispatch:** The outbox worker still logs success rather than executing real HTTP POSTs to third-party endpoints.
2. **True Concurrent E2E Tests:** The test suite validates the logic locally but does not yet spin up a real MariaDB container during CI to prove transactional locking under load.
