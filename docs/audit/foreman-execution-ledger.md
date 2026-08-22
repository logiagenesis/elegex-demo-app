# Foreman Execution Ledger

**Purpose:** This ledger is the required evidence template for the remaining authenticated synthetic foreman journey. A row is completed only after the actual UI action, resulting tRPC request, and tenant-scoped database result are observed. Blank fields are deliberately left unfilled.

> **Integrity rule:** A rendered control, a source procedure, or a unit test is not sufficient to complete a row. Every row requires an authenticated UI result and a queryable persistence result from the same synthetic job.

| Step | Authenticated UI action                               | Required procedure and payload evidence                         | Required persistence result                                                              | Current status                                                         |
| ---- | ----------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| E-01 | Open assigned synthetic job card                      | `fieldService.foreman.today` and selected `jobId`               | Assigned `jobs` and `jobVisits` rows within one organization                             | Partially observed for job `#2041`; session unavailable for replay.    |
| E-02 | Record typed consent                                  | `fieldService.foreman.consent` with controlled signer name      | New `jobEvidence` signature plus `consent_recorded` activity row                         | Observed historically; row identifiers recorded in ground-truth audit. |
| E-03 | Check in                                              | `fieldService.foreman.checkIn` with a UUID idempotency key      | `jobs.stage=in_progress`, `checkInAt`, `jobVisits.status=on_site`, `checked_in` activity | Observed historically; row identifiers recorded in ground-truth audit. |
| E-04 | Capture before/after media or documented safe failure | `fieldService.foreman.evidence` with evidence type and UUID key | New `jobEvidence` storage/metadata row or explicit rejected error                        | Pending authenticated session.                                         |
| E-05 | Record a material item                                | `fieldService.foreman.material` with UUID key                   | New `jobMaterials` row and `material_recorded` activity                                  | Pending authenticated session.                                         |
| E-06 | Trigger duplicate replay of one safe mutation         | Same procedure and same UUID key                                | No second domain row; idempotency claim preserved                                        | Unit regression passed; live execution pending.                        |
| E-07 | Capture quote assessment                              | `fieldService.foreman.quote` with UUID key                      | New draft quote and quote item, or later compliant no-price redesign result              | Pending; current numeric-total contract is recorded as non-compliant.  |
| E-08 | Complete or submit completion exception               | `fieldService.foreman.complete` with UUID key                   | Job/visit completion state and `foreman_completed` activity, or later exception record   | Pending authenticated session.                                         |
| E-09 | Verify sync state after reload/offline transition     | Queue events, retry state, and server request log               | IndexedDB record, queue drain proof, and exactly-once server result                      | Pending; current queue is not wired to the foreman UI.                 |

## Recording format

For each completed row, append the UTC timestamp, deployed URL, user role, job ID, request name, redacted input shape, HTTP status, returned identifier, database table/row identifier, and a screenshot or captured page state. A failed result is evidence if it includes the actual error response and leaves an auditable persisted state.

## Current session boundary

The available published browser is at the public sign-in shell. Its login flow presents a human-verification challenge, so the open rows are intentionally not filled using a simulated identity, direct database write, or fabricated screenshots.
