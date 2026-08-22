# Phase 3 Hardening Self-Audit

Date: 2026-08-22

## Executive Summary

This self-audit validates the Phase 3 hardening and CI remediation. The repository's continuous integration pipelines (Quality and CodeQL) are now passing on the `main` branch. All automated Dependabot PRs have been merged, except for a known `@babel/core` conflict which has been ignored to prevent workflow failures.

**Key Questions:**

1. Deploy to production tonight? **NO**. The application lacks real DB CI (MariaDB service, migrations from zero, schema guard, transaction/FK/idempotency concurrent test), true E2E tests, and production-grade authentication/storage adapters.
2. Let paying customer data in? **NO**. The API is not multi-tenant API-key/scopes or sellable API, and documentation calling it `/api/v1/jobs/list` is false.
3. Sign off in acquisition? **NO**. The repository is still missing critical owner-only security settings (branch protection, private vulnerability reporting, secret scanning) and a comprehensive security roadmap.

## Checklist & Gap Register

### 1. CI / CD Pipeline

- [x] **Quality Workflow:** Passing on `main` (Node 22, frozen lockfile, format check, TypeScript check, Vitest, Vite/esbuild build).
- [x] **CodeQL Workflow:** Passing on `main`.
- [x] **Dependabot:** Configured and merged. Babel core update ignored due to conflicts.
- [ ] **Gap:** No E2E testing (Playwright).
- [ ] **Gap:** No real database integration testing in CI.

### 2. Security & Settings

- [ ] **Gap:** Branch protection rules not enforced (Owner action required).
- [ ] **Gap:** Secret scanning not enabled (Owner action required).
- [ ] **Gap:** Private vulnerability reporting not enabled (Owner action required).
- [ ] **Gap:** Repository visibility is public, should be private (Owner action required).
- [ ] **Gap:** Commit signing not enforced (Owner action required).

### 3. Application Architecture

- [x] **Frontend:** Successfully builds and passes basic component tests.
- [ ] **Gap:** Dashboard and Records pages were partially extracted, but original CRUD dialogs/drawer/archive behavior is missing, and tests were weakened.
- [ ] **Gap:** `server/routers/api/v1.ts` is a mock tRPC endpoint, not a true REST API.
- [ ] **Gap:** `server/_core/env.ts` uses `safeParse` and raw `process.env` fallback, violating the master directive's strict env-access pattern.
- [ ] **Gap:** Database pool typing and connection management (`server/connectors/database.ts`) need rework and real DB tests.
- [ ] **Gap:** Outbox worker (`server/connectors/worker.ts`) lacks HMAC provider delivery, lease/reaper/DLQ, separate process, and real DB concurrency proof.

### 4. Code Quality

- [x] **Formatting:** Prettier enforces consistent code style across the repository.
- [ ] **Gap:** Multiple files still exceed the 500-line limit mandated by the master directive (e.g., `FieldServicePages.tsx`, `server/db.ts`).

## Python-Grade Comparison

- **Backend Framework:** Express/tRPC is currently used. It lacks the built-in structural rigor of Django/FastAPI (e.g., automatic OpenAPI generation, strict Pydantic validation at all boundaries).
- **Task Queue:** The current outbox worker is a simple in-process poller. It is **significantly weaker** than Celery (lacks robust retry, DLQ, monitoring, and separate worker processes).
- **ORM:** Drizzle ORM is used. While capable, the current setup lacks the mature migration management and complex relationship handling often seen in SQLAlchemy setups.

## Next Steps

1. Owner must configure the missing GitHub security settings.
2. Implement real database CI testing.
3. Rework the environment variable handling to be strictly validated without fallbacks.
4. Refactor oversized files to meet the 500-line limit.
5. Restore full functionality to the Dashboard and Records pages and strengthen their tests.
6. Design and implement a true REST API with proper tenant isolation and API key management.
