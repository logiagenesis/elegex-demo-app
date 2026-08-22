# Iterative System Audit

**Audit date:** 22 August 2026  
**Scope:** Repository integrity, database and seed data, tRPC server contracts, route rendering, actionable UI controls, production build, published public-route smoke, dependency audit, and GitHub alignment.

## Summary

The audit found one actionable live-data defect: three legacy synthetic identities and three newer scoped synthetic identities existed as separate active members in the same demonstration workspace. This made the administration screen show duplicate names and made the field-service history split across duplicate user IDs. The defect was repaired in the active tenant and the seeding, server response, and client refresh paths were hardened so it cannot recur through normal reset/reseed behavior.

| Audit surface | Evidence | Outcome |
| --- | --- | --- |
| Repository and GitHub | `main` and the connected GitHub remote had zero divergence at the baseline. | Passed; final synchronization follows this report. |
| Type and unit regression suite | `pnpm verify` completed TypeScript, build, and 70 tests across 13 files. | Passed. |
| Production dependencies | `pnpm audit --prod --json` produced no advisory records. | Passed. |
| Published public routes | `pnpm smoke:release` exercised `/`, `/jobs`, `/documents`, `/reports`, and `/field`, including first-party assets, mobile layout, and a managed document. | Passed; browser-profile blocked analytics requests are excluded from application failure criteria. |
| Authenticated primary routes | Command centre, jobs, dispatch, documents, reports, staging, administration, and settings were rendered in one controlled desktop pass. | Passed. |
| Navigation and controls | Job creation, document upload, report CSV export, staged release visibility, role selectors, demo reset confirmation, settings save, and document download controls were inspected through their live route surfaces and server contracts. | Passed, with mutation behavior covered by procedure and workflow suites. |
| Database contract | Required typed document, retention, job, organization-setting, idempotency, outbox, and membership structures were present. | Passed. |

## Remediation: duplicate synthetic identities

The live query identified duplicate active demo users with identical emails but different `openId` values. A transaction merged job, visit, task, and activity references into the original demo identities and retired the redundant memberships. Post-repair checks confirmed exactly one active membership each for Mila Petersen, Jordan Okoro, and Sana Davids.

The source repair now reuses an existing organization member by normalized demo email before inserting a seed user, retires additional redundant memberships if legacy data is encountered, filters inactive rows in the administration query, and collapses duplicate email identities defensively in server payloads. Administration refetches on mount and renders explicit loading and retry states rather than a blank membership panel. Two focused regressions cover top-level and nested administration member identity collapse.

## Boundaries retained honestly

The public smoke browser profile blocks selected third-party analytics, ping, fetch, and script requests with `ERR_BLOCKED_BY_CLIENT`. The test records these separately from first-party asset and application-runtime failures; no application exception or required first-party asset failure was detected.

The authenticated foreman execution ledger remains limited by the documented human-verification challenge. This audit confirms protected-route rendering and code/test contracts but does not claim unperformed live mutations.
