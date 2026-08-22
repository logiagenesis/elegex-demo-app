# Deep Code Hardening Audit

**Audit date:** 22 August 2026  
**Scope:** Application code, data integrity, tRPC boundaries, offline replay, migration compatibility, runtime dependencies, and production build behavior.

## Executive conclusion

The application passed a fresh static type check, its full **68-test / 13-file** regression suite, and a production build after the remediation work described below. The production dependency audit completed with no reported advisories. This audit deliberately favors fail-closed tenant checks, explicit transaction boundaries, deterministic idempotency behavior, and explicit recovery states rather than relying on best-effort UI behavior.

| Area | Verified weakness | Hardening outcome |
| --- | --- | --- |
| Demo reset | The destructive reset and reseed sequence could complete partially if a later step failed. | The default reset path now performs cleanup and both deterministic seed stages inside one transaction boundary. |
| Record mutations | Update/archive paths could silently match no record while still appending activity history. | Active tenant records are asserted before update/archive writes and audit inserts. |
| Member roles | An administrator could target the owner membership for reassignment. | The owner role is protected server-side before the mutation is applied. |
| Settings | A workspace without an existing settings row could receive a silent update no-op. | Settings now use deterministic insert-or-update semantics. |
| Documents | Partial relation filters could reach the data layer. | tRPC and persistence both reject resource/record-ID mismatch input. |
| Field data | Soft-deleted jobs could appear in dispatch or invoice-ready datasets. | Dispatch and invoice-control queries now exclude deleted jobs. |
| Outbox | Duplicate enqueues could return `0`; future events could be returned as dispatchable. | Replays return the canonical event ID without rescheduling an existing event; dispatch is active-connection and due-time gated. |
| Offline queue | Missing dependency IDs could leave a mutation indefinitely blocked. | Queue insertion rejects unknown dependencies; stored corrupt dependencies are terminally contained; mount recovers interrupted sync. |
| Schema drift | Startup only guarded the earlier field-service columns. | The compatibility guard now includes typed document classification and retention fields from migration 0011. |

## Runtime and dependency hardening

Unused AWS S3 client packages and unreachable template-only markdown/chat surfaces were removed from the production graph. Runtime dependencies were updated to **tRPC 11.18**, **Drizzle ORM 0.45**, **Axios 1.19**, **NanoID 6**, **Recharts 3**, and **Express 5**. The Express upgrade required two explicit compatible route changes: a named managed-storage wildcard and pathless terminal middleware in the Vite/static bridge. The Recharts update required the local chart helper to use explicit custom tooltip and legend payload contracts instead of removed version-2 internal prop shapes.

The final `pnpm audit --prod --json` scan completed without any advisory records. The repository still emits a development-only peer warning for the visual source-location plugin against Vite 7; it is not in the production runtime graph and did not affect the type check, tests, build, or running preview.

## Regression evidence

The audit expanded regression tests for reset transaction containment, schema compatibility, idempotent outbox replay identity, paused-connection dispatch rejection, owner-role protection, active-record no-op prevention, partial document filters, and unknown offline dependencies. The quality gate passed TypeScript, all 68 tests, and the production bundle. A post-migration visual verification also showed the command centre and its Recharts dashboard rendering after the dependency upgrades.

## Intentional boundaries

Object storage has no delete helper in the deployed template, so the database transaction can roll back metadata and relationship records but cannot atomically erase an object that was already uploaded before a later database failure. Storage uploads use random, tenant-scoped managed keys and orphan objects are inaccessible through document records; lifecycle cleanup remains an infrastructure concern rather than a claim of distributed transactional atomicity.

The previous authenticated foreman execution ledger remains bounded by the human-verification challenge documented in the Phase 2 audit. This hardening pass does not fabricate completion evidence or treat a rendered route as mutation proof.

## Source review

The major dependency migrations were reviewed against their official migration guides before execution. The supporting source notes are retained in [`dependency-hardening-sources.md`](./dependency-hardening-sources.md).
