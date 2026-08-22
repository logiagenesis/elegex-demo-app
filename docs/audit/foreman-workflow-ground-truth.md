# Foreman Workflow Ground Truth Audit

**Audit date:** 21 August 2026  
**Method:** Current source-contract inspection, existing automated procedure coverage, and connected published-browser observation. This is **not** a complete authenticated mutation replay.

> **Status: PARTIAL.** An earlier preliminary audit marked the workflow largely absent; the current source confirms a partial persistence-backed implementation. Neither observation establishes completion of the directive’s F-00 through F-09 requirements.

| Reference step | Current result | Backing procedure | Actual writes | Execution evidence and limitation |
|---|---|---|---|---|
| F-00 versioned POPIA location consent | PARTIAL | `fieldService.foreman.consent` | `jobEvidence` signature artifact; `activityLogs` `consent_recorded` | Typed consent persists against a job. No versioned consent table, withdrawal, policy record, or check-in gate exists. |
| F-01 today list | PARTIAL | `fieldService.foreman.today` | Read-only query of `jobs`, `contacts`, `jobVisits` | Assigned scheduled/in-progress/on-hold jobs render. Date navigation, travel gaps, and server-backed sync stamp are absent. |
| F-02 job card | PARTIAL | Today query and in-page state | No independent job-card contract | A live card and controls render; time counter, evidence thumbnails, and sign-off state are absent. |
| F-03 geo check-in/check-out | PARTIAL | `fieldService.foreman.checkIn`, `fieldService.foreman.complete` | `jobs`, `jobVisits`, `activityLogs` | Check-in/completion are transactional but use `manual_override` geo state; no GPS, distance flag, or trip intent exists. |
| F-04 camera/media capture | PARTIAL | `fieldService.foreman.evidence` | `jobEvidence`; `activityLogs` | Evidence metadata persists for before/after/note/job-card; no media bytes, thumbnails, or offline uploads. |
| F-05 call-out/travel/materials | PARTIAL | `fieldService.foreman.material` | `jobMaterials`; `activityLogs` | Free-text material persists only during active visit. Call-out, travel, catalogue, and office-to-price states are absent. |
| F-06 quote assessment | PARTIAL / UNSAFE | `fieldService.foreman.quote` | `quotes`, `quoteItems`, `activityLogs` | Draft quote persists but accepts a numeric total, contrary to the no-prices-on-foreman directive. |
| F-07 client sign-off | ABSENT | None | None | No canvas, signer capacity, or unsigned-with-reason outcome. |
| F-08 completion with gaps | PARTIAL | `fieldService.foreman.complete` | `jobs`, `jobVisits`, `activityLogs` | Completion reaches `ready_for_invoicing`; no checklist, exception table, gap remediation, or office queue. |
| F-09 offline sync status | PARTIAL UTILITY / ABSENT PRODUCT | Remote `syncQueue` utility; no wired procedure | Client utility only | Queue code and tests exist on the remote branch, but no field UI integration, service worker, persisted media, or end-to-end replay evidence is accepted. |

### Offline queue and idempotency boundary

`client/src/lib/syncQueue.ts` does provide a browser-only IndexedDB mutation store, client-generated UUID keys, dependency ordering, interrupted-work recovery, retry state, exponential backoff with jitter, and Blob-compatible structured cloning. Its tests exercise queue ordering, retry, persistence, and recovery. The server now accepts optional UUID idempotency keys for check-in, material, evidence, quote, and completion. It claims the key in `syncLogs` under a unique `(organizationId, idempotencyKey)` constraint before applying the business mutation, so a duplicate invocation returns without creating another write.

However, the utility does not yet enqueue the existing foreman procedures, expose a real F-09 interface, register a service worker, or provide a real offline-to-online replay execution record. It is therefore recorded as an implementation component with server-side deduplication support, not as verified offline field capability.

## Observed partial execution

In the connected published owner session, synthetic job `#2041` (`jobs.id = 30031`, organization `1`) showed the field job card. The following real persisted actions were executed before the session reverted to the public sign-in shell:

| Timestamp (UTC) | Action | Procedure | Persisted evidence |
|---|---|---|---|
| 2026-08-21 16:57:08 | Typed consent with signer `Elegex Field Foreman` | `fieldService.foreman.consent` | `jobEvidence.id = 90001`, type `signature`, `syncStatus = synced`; `activityLogs.id = 120001`, action `consent_recorded`. |
| 2026-08-21 16:57:35–16:57:36 | Check-in | `fieldService.foreman.checkIn` | `activityLogs.id = 120002`, action `checked_in`; job `30031` became `in_progress`, with `checkInAt = 2026-08-21 16:57:36` and `geoStatus = manual_override`. |

The database evidence confirms those two procedure writes. It also confirms the directive gap: no GPS coordinate or distance flag was stored. The session reverted before media, material, signature, completion-with-gaps, and offline-drain steps could be executed. This does not prove a complete workflow.

## Required remediation before acceptance

Complete and record consent, GPS check-in, evidence media upload, material, client signature, completion with recorded gaps, and offline queue drain using a dedicated test identity. Capture procedure names, timestamps, queryable resulting row IDs, and exact-once replay outcomes. Until then the workflow remains incomplete.
