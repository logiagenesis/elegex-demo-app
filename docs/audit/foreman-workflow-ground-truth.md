# Foreman Workflow Ground Truth Audit

**Audit date:** 21 August 2026  
**Method:** Source-contract inspection, automated procedure coverage, and the connected published owner browser observation. This is **not** a complete authenticated mutation replay. No production mutation was issued during this audit.

> **Status:** The prior acceptance language overstated the foreman implementation. The current `/field` route is a persistence-backed **partial workflow**, not the complete F-00 through F-09 product specified in the reference directive.

| Reference step | Current result | Backing procedure | Actual writes | Execution evidence and limitation |
|---|---|---|---|---|
| F-00 versioned POPIA location consent | **PARTIAL** | `fieldService.foreman.consent` | `jobEvidence` signature artifact; `activityLogs` `consent_recorded` | Typed consent is persisted against a job. There is no dedicated versioned consent table, policy record, withdrawal flow, or consent precondition for check-in. |
| F-01 today list | **PARTIAL** | `fieldService.foreman.today` | Read-only query of `jobs`, `contacts`, `jobVisits` | Assigned scheduled/in-progress/on-hold jobs render. Yesterday/today/tomorrow navigation, travel-gap logic, and server-backed sync timestamp are absent. |
| F-02 job card | **PARTIAL** | Existing today query and field view state | No independent job-card data contract | The live page renders a job card and action controls. It does not yet provide the reference-grade time panel, media thumbnails, sign-off state, or separate card route. |
| F-03 geo check-in/check-out | **PARTIAL** | `fieldService.foreman.checkIn`, `fieldService.foreman.complete` | `jobs` stage/check-in/check-out timestamps; `jobVisits` status; `activityLogs` | Check-in and completion are transactional, but they persist `manual_override` geo status and do not accept GPS, calculate a distance flag, or support material-trip checkout intent. |
| F-04 camera/media capture | **PARTIAL** | `fieldService.foreman.evidence` | `jobEvidence`; `activityLogs` `evidence_captured` | The procedure persists evidence metadata for before/after/note/job-card modes. It does not accept media bytes, generate thumbnails, or queue offline uploads. |
| F-05 call-out/travel/materials | **PARTIAL** | `fieldService.foreman.material` | `jobMaterials`; `activityLogs` `material_recorded` | Materials are persisted during an active visit. Call-out types, travel toggle, catalogue search, `office_to_price`, and used/for-quote state are absent. |
| F-06 quote assessment | **PARTIAL / UNSAFE** | `fieldService.foreman.quote` | `quotes`, `quoteItems`, `activityLogs` `quote_captured` | The workflow persists a draft quote, but it accepts and stores a numeric total. This violates the directive’s no-prices-on-foreman requirement and must be redesigned. |
| F-07 client sign-off | **ABSENT** | None | None | The current typed consent artifact is not client sign-off. There is no signature canvas, signer-role choice, or unsigned-with-reason outcome. |
| F-08 completion with gaps | **PARTIAL** | `fieldService.foreman.complete` | `jobs`, `jobVisits`, `activityLogs` `foreman_completed` | Completion moves an in-progress job to `ready_for_invoicing`. There is no checklist, exception table, gap remediation, or office exception queue. |
| F-09 offline sync status | **ABSENT** | None | None | The rendered sync labels are local UI state. There is no IndexedDB outbox, idempotency key, retry queue, persistence across reboot, or background sync. |

## Current execution evidence

The connected published owner session rendered the field list and opened job `#2041`. The job card visibly showed **READY TO SYNC**, typed-consent guidance, check-in, material/evidence/quote/completion controls, and the four evidence labels. This confirms that the page renders. It does **not** constitute end-to-end evidence that every control completes a persisted workflow, survives an offline reboot, or drains a queue exactly once.

The existing automated suite covers selected procedure authorization and selected workflow behavior. It does not provide the directive-required complete journey of consent, GPS capture, media upload, material capture, client sign-off, completion with recorded gaps, and sync-queue drain.

## Required remediation before acceptance

The work remains **incomplete** until the F-00 through F-09 capabilities are implemented with tenant-scoped persistence, authenticated execution logs, and the specific offline/idempotency verification requested in the directive. The previous final acceptance decision is superseded by the retraction in `final-acceptance-report.md`.
