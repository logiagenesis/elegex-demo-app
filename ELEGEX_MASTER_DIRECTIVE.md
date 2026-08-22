# ELEGEX MASTER BUILD DIRECTIVE — PHASE 3 "BIG BANG"
Version 1.0 | Authority: supersedes all prior instructions | Owner: logiagenesis

## 0. STANDING ORDERS — READ BEFORE EVERY ACTION, EVERY RUN

These apply to this run and to every future run. Re-read them before each work
package. If any instruction elsewhere conflicts with Section 0, Section 0 wins.

**0.1 — GITHUB IS THE ONLY TRUTH.**
Nothing exists until it is committed, pushed, and independently re-verified by
re-fetching it from `https://github.com/logiagenesis/elegex-demo-app`. Your
sandbox state, your preview URL, and your memory of what you did are NOT
evidence. After every push you MUST re-fetch the pushed files from the raw
GitHub URL and diff them against what you intended. Report the diff.

**0.2 — NO FABRICATED COMPLETION.**
You have previously declared this project complete and then retracted it in
`docs/audit/final-acceptance-report.md`. Do not repeat that. A rendered page is
not proof. A passing type-check is not proof. "Should work" is not proof. Proof
is: a named test that fails without the change and passes with it, plus a
resulting row ID, HTTP status, or CI run URL.

**0.3 — MANDATORY SELF-AUDIT GATE.**
You may not end any run without completing Section 8 in full and committing
`docs/audit/self-audit-<ISO-DATE>.md`. If you run low on context or time,
you STOP implementing and you WRITE THE AUDIT. An honest partial delivery with
a truthful gap list is a success. A confident claim of completion is a failure.

**0.4 — DECLARE GAPS LOUDLY.**
Every incomplete item goes in the gap register with a severity, an owner, a
reason, and the exact remaining work. Never quietly drop scope. Never mark
something DONE that is PARTIAL. Use only: DONE / PARTIAL / NOT STARTED /
BLOCKED. "DONE" requires linked evidence.

**0.5 — PYTHON-GRADE BACKEND RIGOUR.**
The reviewing engineers are senior Python/backend people. For every backend
change, state the Python-ecosystem equivalent you are matching (Celery/RQ for
workers, `SELECT ... FOR UPDATE SKIP LOCKED` for queue claims, Alembic for
migrations, `INSERT ... ON CONFLICT DO NOTHING` for idempotency, pydantic for
env/settings validation, structlog for logging). If your TS implementation is
weaker than the Python norm, say so explicitly.

**0.6 — SMALL FILES, REVIEWABLE DIFFS.**
No source file may exceed 500 lines. Split god-files before adding to them.

---

## 1. CONTEXT

- **Repo:** github.com/logiagenesis/elegex-demo-app (currently PUBLIC, MIT)
- **App:** elegexapp-jvc9dhln.manus.space
- **Design reference:** elegex-ux-mocks.vercel.app
- **Stack:** React 19 + Vite 7, Express 5, tRPC 11, Drizzle 0.45, MySQL/TiDB,
  pnpm 10, Vitest, GitHub Actions
- **Goal:** convert an impressive demo into a resellable, multi-tenant,
  offline-capable field-service platform for South African contracting, built
  on a locale abstraction so other markets can be added.

**Domain correction (mandatory):** a previous decision stripped the South
African identity in favour of "global/USD/UTC". That destroyed the product's
value. Reverse it. Build `packages/locale/` with pluggable market packs and
ship **ZA as the first complete pack**: ZAR, 15% VAT, `Africa/Johannesburg`,
SA phone/ID formats, POPIA consent, CoC compliance certificates, and call-out
tiers (Cape Town / Johannesburg / after-hours). Never hardcode a locale again.

---

## 2. CONFIRMED DEFECTS — FIX ALL OF THESE

Each has been independently verified against the repo. Do not re-litigate them.

### 2.1 Repository governance
- **[P0] Git author email is corrupted:** commits carry
  `1.18143711e+08+logiagenesis@users.noreply.github.com` — the user ID
  `118143711` coerced to a float. Every commit returns `"author": null` and is
  unattributed. Set `git config user.email
  "118143711+logiagenesis@users.noreply.github.com"` and never let a numeric
  ID pass through float formatting again. Document the fix.
- **[P0] All commits unsigned** (`verified: false`). Enable and document commit
  signing; add `web_commit_signoff_required`.
- **[P0] `main` has zero branch protection.** Add a ruleset: require PR,
  require 1 approval, require all status checks, block force-push, require
  linear history, require conversation resolution. Add `CODEOWNERS`.
- **[P0] Repo is PUBLIC and MIT-licensed** while intended for resale. Add
  `docs/legal/licensing-recommendation.md` covering the exposure, replace
  `LICENSE` with a proprietary "All Rights Reserved" file, and add a task for
  the owner to flip repo visibility to private. Do not silently keep MIT.
- **[P0] Security features disabled:** private vulnerability reporting,
  Dependabot alerts, secret scanning, code scanning are all OFF. Commit
  `.github/dependabot.yml`, a CodeQL workflow, gitleaks/trufflehog in CI, and
  `docs/ops/github-security-setup.md` listing the exact toggles the owner must
  flip in Settings (you cannot flip them yourself — say so).
- **[P1] Stale merged branches left undeleted** creating false red checks.
  Enable auto-delete-on-merge; document it.

### 2.2 Dependency manifest
- **[P0] `"resolutions"` is Yarn syntax and is SILENTLY IGNORED by pnpm.** The
  nanoid pin has never applied. Move to `pnpm.overrides`. Prove it applied via
  `pnpm why nanoid`.
- **[P0] Remove the junk package `"add": "^2.0.6"`.**
- **[P0] Remove `pnpm` from devDependencies;** it conflicts with the
  `packageManager` pin and is causing Dependabot PR churn.
- **[P1] `vitest@2` against `vite@7`** — upgrade to vitest 3.
- **[P1] Add `engines` (node >=22) and `.nvmrc`.**

### 2.3 Security & runtime hardening
- **[P0] Delete `client/public/__manus__/debug-collector.js`** from the
  production build. Third-party telemetry shipping alongside client PII and
  worker GPS is a due-diligence and POPIA failure.
- **[P0] No graceful shutdown.** Add SIGTERM/SIGINT: stop accepting
  connections, drain in-flight requests with a timeout, stop the outbox worker,
  close the DB pool, then exit.
- **[P0] `findAvailablePort()` in production.** Bind the configured port and
  fail loudly if unavailable. Port drift breaks health checks and LBs.
- **[P0] Add `helmet`, strict CORS allow-list, CSP, HSTS.**
- **[P0] Add rate limiting** — global, per-IP, per-tenant, per-user, with
  stricter limits on auth and upload paths.
- **[P0] `express.json({limit:"50mb"})`** is a DoS vector. Drop to 1MB for JSON
  and route uploads through a separate authenticated multipart path with size,
  MIME sniffing, and extension validation.
- **[P0] Fix `server/_core/env.ts`:** fail fast in ALL environments (test may
  use an explicit override file), delete the `process.env as any` fallback,
  export every validated key, and make `getDatabase()` read from `ENV` instead
  of raw `process.env`. One environment access pattern, no exceptions.
- **[P1] Configure the DB pool:** connectionLimit, connectTimeout, idleTimeout,
  maxIdle, retry-with-backoff on transient failure, and pool close on shutdown.
- **[P1] Add correlation IDs + structured JSON logging** (pino). Remove every
  `console.log` from server runtime paths.

### 2.4 Tenancy — structural
- **[P0] Single-column FKs prove parent existence, not same-tenant
  composition.** Add composite unique keys `(organizationId, id)` to every
  referenced table and convert every child FK to composite
  `(organizationId, parentId)`. This makes cross-tenant references impossible
  at the database engine level rather than by convention.
- **[P0] Write an adversarial two-tenant isolation test that enumerates EVERY
  procedure in the router** and asserts tenant B can never read or mutate
  tenant A's rows. Fail CI if any new procedure is added without coverage —
  enumerate the router programmatically so the test cannot be forgotten.

### 2.5 The outbox worker — currently unsafe
Your own comment admits it "lacks atomic claims, lease expiry, and real webhook
dispatch." It is worse: `startOutboxWorker()` runs inside `server.listen()`, so
**every scaled instance polls the same table with no lock**. It also queries
across all organizations with no tenant scope.
- **[P0] Disable by default** behind `OUTBOX_WORKER_ENABLED=false`.
- **[P0] Atomic claim** via `SELECT ... FOR UPDATE SKIP LOCKED` (or a
  compare-and-swap claim with a worker UUID + lease expiry).
- **[P0] Lease expiry + reaper** for rows stranded in `processing`.
- **[P0] Real HTTP dispatch** with HMAC-SHA256 signature, timestamp, replay
  window, timeout, and delivery receipts.
- **[P0] Dead-letter queue** with an admin replay UI.
- **[P1] Extract to a separate `worker` process/entrypoint** so it scales
  independently of the web tier. State the Celery equivalent.

### 2.6 Code structure
- **[P0] Split `server/db.ts` (99KB)** into `server/domain/<aggregate>/` with
  repository + service layers.
- **[P0] Split `client/src/pages/ElegexPages.tsx` (98KB)** and
  `FieldServicePages.tsx` (55KB)** into one file per route plus components.
- **[P0] Split the single router** into `server/routers/<domain>.ts` merged by
  a root router.

---

## 3. THE FOREMAN WORKFLOW — F-00 → F-09, FOR REAL

`docs/audit/foreman-workflow-ground-truth.md` grades every step PARTIAL or
ABSENT. Close all of it. The Vercel mock is the functional specification.

- **F-00 Consent:** versioned `consentPolicies` + `consentGrants` tables,
  policy text + version + timestamp + IP + device, withdrawal support, and a
  **hard gate** blocking check-in without a current grant. POPIA-compliant
  wording: GPS at check-in/check-out only, never during travel or after hours.
- **F-01 Today:** date navigation (yesterday/today/tomorrow), travel-gap
  rendering, server-backed last-sync timestamp, offline-readable.
- **F-02 Job card:** live on-site duration counter, evidence thumbnails,
  sign-off state, materials summary.
- **F-03 Geo check-in/out:** real `navigator.geolocation` capture, lat/lng +
  accuracy + captured-at persisted, distance-from-site computed server-side,
  out-of-radius flag, and check-out **intent** (`fetching_materials` = travel
  vs `leaving_site` = work paused/done). Retain `manual_override` with a
  mandatory reason for GPS-denied cases.
- **F-04 Media:** actual binary upload. Client compresses, stores the Blob in
  IndexedDB, uploads to a tenant/job/type-scoped key, computes SHA-256, then
  writes evidence metadata referencing the object. Before/after sets, EXIF
  strip, thumbnails, retry-on-fail, per-file progress.
- **F-05 Materials:** real catalogue with search, frequent-first ordering,
  quantity steppers, call-out tier selection, travel toggle, and the
  **Used ● / For quote ○** dual state from the mock.
- **F-06 Quote assessment:** **REMOVE the numeric total from the foreman
  contract entirely.** Foreman marks items for quote; the office prices them.
  Enforce with a server-side response filter and a test that asserts no
  monetary field is ever serialised to a foreman-role caller.
- **F-07 Signature:** canvas capture, signer name + capacity (client vs other),
  "unsigned with reason" outcome, and a no-prices client summary.
- **F-08 Completion with gaps:** checklist evaluation, explicit `jobExceptions`
  rows per gap, completion permitted **with** recorded gaps, routing to the
  office Ready-for-Invoicing queue, and office-side gap remediation.
- **F-09 Offline:** wire `SyncQueue` to every foreman mutation, register a
  service worker + PWA manifest, cache the app shell and today's jobs, make
  `idempotencyKey` **required** server-side once wired, build the Sync screen
  from the mock (queued / retrying / failed with actionable errors), and prove
  a full airplane-mode → reconnect replay end to end.

---

## 4. NEW CAPABILITIES — BUILD THESE

**Dispatch:** drag-and-drop board, travel-time-aware assignment, skills and
certification matching, capacity view, recurring maintenance contracts, SLA
response clocks with breach alerts, route optimisation.

**Commercial:** money as minor units + ISO-4217 currency (never `int` alone),
VAT (15% ZA, configurable), quote versioning with accept/reject audit,
deposits, progress billing, retention, credit notes, ageing report,
**two-way** accounting sync for **Xero and Sage** (SA-relevant) plus QuickBooks,
with OAuth token refresh, inbound webhooks, and reconciliation.

**Inventory:** material catalogue, supplier price lists, van/bin stock levels,
purchase orders, reorder points, stock movements tied to job materials.

**Compliance:** CoC issuance with numbering, installer registration numbers,
certificate expiry and renewal reminders, document retention classes.

**Customer portal:** quote accept/reject with e-signature, self-service
booking, live technician ETA, invoice view and payment, job history.

**Notifications:** email templates, SMS, **WhatsApp Business**, web push,
per-user preferences, quiet hours, digest batching.

**Privacy/data:** POPIA/GDPR subject access export, erasure with legal-hold
override, per-tenant retention policy, field-level PII encryption, and a
**hash-chained append-only audit log** (current `activityLogs` is mutable).

**Platform / sellable APIs:** versioned public **REST API with OpenAPI 3.1**
(`/api/v1/**`) generated from the same Zod schemas as tRPC — tRPC alone is not
a sellable integration surface. Add per-tenant API keys with scopes, rate
limits, an `Idempotency-Key` header on all public POSTs, outbound webhooks with
HMAC + replay protection, and a published deprecation policy.

**Observability:** OpenTelemetry traces, pino JSON logs with correlation IDs,
Sentry, RED metrics, `/healthz` + `/readyz`, per-tenant usage metering.

**Commercial scaffolding:** subscription plans, feature flags per plan, seat
management, tenant onboarding wizard, white-labelling.

---

## 5. TESTING — THE CURRENT GREEN BADGE IS THEATRE

CI runs format + tsc + vitest + build on one Node version with **no database**.
Transactions, foreign keys, the schema guard, and the idempotency claim are
therefore never actually tested, and **migrations never run in CI at all**.

Build this pyramid and wire all of it into CI:
1. **ESLint** (typescript-eslint strict, react-hooks, no-floating-promises,
   import/order) — currently ABSENT. Zero warnings allowed.
2. **Unit** — Vitest, ≥85% line and branch coverage, enforced as a hard gate.
3. **Integration against a real MySQL/MariaDB service container.** Apply every
   migration from zero on every CI run. Test transaction rollback, FK
   rejection, the schema guard, and soft-delete filtering.
4. **Concurrency test:** fire N simultaneous mutations with the same
   idempotency key; assert exactly one business write and one `syncLogs` row.
   (This is follow-up #4 from your own `python-reviewer-audit.md`.)
5. **Adversarial tenant isolation** across every enumerated procedure.
6. **RBAC matrix** — every role × every procedure, expected allow/deny.
7. **E2E (Playwright)** — office and foreman journeys, plus an **offline
   replay** test using CDP network throttling to simulate airplane mode.
8. **Migration reversibility** — up, down, up; assert schema equality.
9. **Security:** `pnpm audit --prod` (fail on high), CodeQL, gitleaks, and an
   OWASP ASVS L2 checklist.
10. **a11y (axe) and Lighthouse budgets** with performance thresholds.

Also add: OpenAPI contract/breaking-change check, `docker-compose.yml` for
local parity, and matrix CI across Node 22 and 24.

---

## 6. DOCUMENTATION TO PRODUCE

`docs/architecture/` (C4 diagrams, ADRs for every significant decision),
`docs/api/` (OpenAPI spec, auth guide, webhooks, rate limits, versioning and
deprecation policy, integration quickstarts), `docs/database/` (ERD, data
dictionary, migration runbook, backup/restore/PITR, index rationale),
`docs/ops/` (runbook, on-call, incident response, DR with stated RTO/RPO, SLOs,
GitHub security setup), `docs/security/` (threat model, POPIA/GDPR data map,
processor register, pen-test scope, encryption inventory),
`docs/product/` (feature spec, role matrix, user guides per role, release
notes), and `docs/legal/` (licensing recommendation, third-party notices, SBOM).

Add a documentation-freshness CI check: any change under `server/routers/` or
`drizzle/` that does not touch `docs/` fails the build with an explanatory message.

---

## 7. EXECUTION ORDER

Work in this order; commit and push after each work package with a
Conventional Commit message.

**WP-A Governance & security baseline** (2.1, 2.2, 2.3, delete debug-collector)
**WP-B Structural decomposition** (2.6 — split the god-files BEFORE adding code)
**WP-C Tenancy hardening** (2.4 composite keys + adversarial tests)
**WP-D Test infrastructure** (Section 5 — build the harness before the features)
**WP-E Locale abstraction + ZA pack** (Section 1 domain correction)
**WP-F Foreman F-00→F-09** (Section 3)
**WP-G Outbox worker rebuild** (2.5)
**WP-H Public REST/OpenAPI + webhooks + API keys** (Section 4 platform)
**WP-I New capabilities** (Section 4 remainder, prioritised by resale value)
**WP-J Observability + operations** (Section 4)
**WP-K Documentation** (Section 6)
**WP-L Final self-audit** (Section 8)

If you cannot finish all of it, finish WP-A through WP-D completely and report
the rest as NOT STARTED. Do not spread yourself thin across every package and
leave everything at 60%.

---

## 8. THE SELF-AUDIT GATE — MANDATORY, NON-NEGOTIABLE

Before you end this run — and every future run — you will perform an
independent adversarial review of your own work and commit
`docs/audit/self-audit-<ISO-DATE>.md`.

**Adopt this persona for the audit:** you are a hostile senior backend engineer
(Python background, 15+ years) doing acquisition due diligence. You are paid to
find reasons NOT to buy. You do not trust the previous author. You have already
caught this codebase claiming completion once and retracting it.

### 8.1 Re-fetch and verify from GitHub
1. `git log --oneline` for this run, with the pushed commit SHAs.
2. Re-fetch every changed file from `raw.githubusercontent.com` and confirm it
   matches your intent. Report any mismatch as a P0.
3. Fetch the latest Actions run and record its URL and conclusion.
4. If CI failed, you are NOT done. Fix and re-push.
5. Confirm the commit author email is the corrected non-scientific-notation
   form and that GitHub attributes the commits.

### 8.2 Run the full checklist — report EVERY line with PASS/FAIL/N-A + evidence
**Correctness:** unhandled promise rejections; missing `await`; swallowed
errors (`catch {}`); `any` escape hatches; off-by-one; nullable dereferences;
timezone/DST bugs; float arithmetic on money; unbounded `Promise.all`.
**Data:** N+1 queries; missing indexes on every WHERE/JOIN/ORDER BY column;
missing composite tenant indexes; unbounded queries with no LIMIT; missing
pagination; transactions that span network I/O; deadlock ordering; migration
reversibility; nullable columns that should be NOT NULL; enums that should be
lookup tables; money stored as float or bare int.
**Security:** SQL injection via raw fragments; IDOR (every ID param must be
tenant-scoped); mass assignment; missing authz on any new procedure; secrets in
code or logs; PII in logs or error messages; missing rate limits; SSRF in any
outbound fetch; path traversal in storage keys; unvalidated redirects; missing
CSRF; insecure cookie flags; JWT/session expiry and rotation.
**Concurrency:** race conditions; lost updates without optimistic locking;
non-atomic read-then-write; duplicate work under horizontal scale; missing
idempotency on any state-changing endpoint.
**Operations:** graceful shutdown; health vs readiness distinction; timeouts on
every outbound call; retries with backoff and jitter; circuit breakers;
resource leaks (intervals, listeners, connections, file handles); memory growth.
**Frontend:** missing loading/empty/error states; unkeyed lists; effect
dependency bugs; memory leaks in effects; unmemoised expensive renders;
uncaught boundary errors; a11y (labels, focus traps, contrast, keyboard nav);
bundle size regressions.
**Process:** dead code; commented-out code; TODO/FIXME left in; magic numbers;
inconsistent naming; files over 500 lines; duplicated logic; test names that
don't describe behaviour; tests that assert nothing; skipped tests.

### 8.3 Rookie-mistake sweep
Explicitly hunt for and report: hardcoded values that should be config;
copy-paste errors; inconsistent error handling between similar handlers;
missing validation on any user input; trusting client-supplied IDs; string
concatenation where parameterisation is required; `console.log` in production
paths; ignored return values; empty catch blocks; `setTimeout` used as
synchronisation; and any place where the demo simulates behaviour it claims to
implement.

### 8.4 Produce the gap register
A table with: ID, Area, Severity (P0/P1/P2/P3), Description, Why it matters,
Exact remaining work, Estimate, Blocking-for-resale (Y/N).

### 8.5 Produce the honesty statement
Three explicit sections:
- **What I actually completed and can prove** (with evidence links)
- **What I claimed or implied but did NOT complete**
- **What I did not attempt and why**

Then answer, in one word each with a one-line justification:
- Would you deploy this to production tonight?
- Would you let a paying customer's data into it?
- Would you sign off on this in an acquisition?

If any answer is "no", the run's status is **PARTIAL**, not complete. Say so in
the first line of the audit document and in your closing message to the user.

### 8.6 Reconcile against prior audits
Open `docs/audit/final-acceptance-report.md`,
`foreman-workflow-ground-truth.md`, and `python-reviewer-audit.md`. For every
item previously marked PARTIAL, ABSENT, or "required follow-up", state its
current status with evidence. **Do not close any item without proof.** If an
earlier document overstated progress, retract it explicitly rather than
quietly overwriting it.

### 8.7 Commit and report
Commit the audit, push it, re-fetch it from GitHub to confirm it landed, and
give the user: the commit SHAs, the CI run URL, the count of P0/P1/P2/P3 gaps,
and the three one-word answers from 8.5. Lead your closing message with the
honest status, not with a summary of effort.

---

## 9. FINAL INSTRUCTION

Do not optimise for appearing finished. Optimise for being trustworthy. A gap
you disclose is a gap the owner can plan around; a gap you conceal is one that
surfaces in front of a buyer. Every claim you make will be independently
re-verified against GitHub by a third-party auditor. Write accordingly.
