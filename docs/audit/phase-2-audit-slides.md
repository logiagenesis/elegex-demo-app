## Cover

**Elegex Phase 2 Audit**

Ground truth, domain restoration, and the offline-first path

21 August 2026

## Slide 1

# The audit required a reset of evidence standards

- The prior acceptance called the field-service lifecycle **accepted**.
- The reference UX analysis called the dedicated foreman workflow **incomplete**.
- Phase 2 treats implementation without execution evidence as **incomplete**.

> Evidence—not rendered routes—determines acceptance.

## Slide 2

# Foreman workflow ground truth: mostly absent

| Journey step              | Verified status |
| ------------------------- | --------------- |
| Consent                   | Absent          |
| Today list                | Absent          |
| Foreman job card          | Partial         |
| Check-in with geolocation | Absent          |
| Before photos             | Absent          |
| Materials capture         | Absent          |
| Signature                 | Absent          |
| Completion with gaps      | Absent          |
| Sync queue drain          | Absent          |

## Slide 3

# The acceptance decision was retracted and reissued

- The prior decision relied on manual observation of rendered routes.
- It did not functionally verify foreman procedures, writes, or offline behaviour.
- `foreman-workflow-ground-truth.md` now records the verified state step by step.

> The foreman workflow remains in the active implementation backlog.

## Slide 4

# WP2 restores South African contracting context

- **Configuration:** `en-ZA`, `ZAR`, and `Africa/Johannesburg` now belong to the organization settings model.
- **Pricing taxonomy:** Temporal, tenant-scoped call-out types support historical-rate preservation.
- **Operating model:** Clients now distinguish domestic, commercial, body corporate, estate/development, and managing agent.

## Slide 5

# Domain schema enables the right commercial relationships

| Domain need                       | Schema response                                        |
| --------------------------------- | ------------------------------------------------------ |
| Temporal call-out rates           | `callOutTypes` with active dates and rate fields       |
| Billing differs from site contact | `clients.billingEntityId` and `sites.contactId`        |
| Contracting locations             | Tenant-scoped `sites` with Western Cape seed geography |
| Job-specific rate history         | `jobs.callOutTypeId`                                   |
| South African locale controls     | `appSettings.locale`, `currency`, and `timezone`       |

## Slide 6

# The WP2 migration adds a durable foundation

- Migration `0008_living_skaar.sql` introduces `callOutTypes`, `clients`, and `sites`.
- It extends `appSettings` with locale, currency, and timezone defaults.
- It links jobs to client, site, and call-out type without destructively rewriting existing job history.
- Seed data introduces valid client types, trade vocabulary, and Western Cape places.

## Slide 7

# Offline-first is not yet implemented

- The existing foreman UI calls direct server mutations.
- There is **no IndexedDB queue**, reboot-surviving state, client UUIDs, or dependency-aware drain.
- UI optimism alone does not provide offline correctness.

> A network interruption can currently prevent a field artifact from being persisted.

## Slide 8

# Offline-first requires a write-ahead architecture

1. **Persist first:** enqueue every mutation in IndexedDB before a network attempt.
2. **Deduplicate always:** client-generated UUIDs and server uniqueness on `(organizationId, idempotencyKey)`.
3. **Respect causality:** check-in before materials; materials and evidence before completion.
4. **Handle binary safely:** store photo and signature blobs, not Data URLs.

## Slide 9

# Safe queue draining protects field work

| Queue capability      | Required control                              |
| --------------------- | --------------------------------------------- |
| Interrupted network   | Exponential backoff with jitter               |
| Replayed operations   | Idempotent server response, no duplicate rows |
| Ordered job lifecycle | Explicit dependency graph                     |
| Large visual evidence | Blob storage in IndexedDB                     |
| Permanent failure     | Actionable item; never silently dropped       |

## Slide 10

# The implementation path is clear and sequenced

- **WP2:** Apply and test the organization-domain migration.
- **WP3/WP5:** Introduce IndexedDB queue, idempotency records, dependency-aware drain, and blob uploads.
- **WP4:** Build typed, governed documents and prove routing across all document types.
- **WP9–WP10:** Verify tenant isolation and authenticated mobile/office journeys in CI.

## Slide 11

# Phase 2 posture: transparent and evidence-led

| Area                      | Status                                        |
| ------------------------- | --------------------------------------------- |
| Acceptance contradiction  | Resolved and documented                       |
| WP2 schema foundation     | Implemented; migration generated              |
| Offline-first engine      | Architecture reviewed; implementation pending |
| Foreman workflow          | Incomplete; ground truth documented           |
| Full Phase 2 verification | Pending further work packages                 |

## Slide 12

# Trust is rebuilt through functional proof

**Build the real workflow.**

**Record the evidence.**

**Accept only what has been verified.**

## References

[1]: ./foreman-workflow-ground-truth.md "Foreman Workflow Ground Truth"
[2]: ./final-acceptance-report.md "Retracted and Reissued Final Acceptance Report"
[3]: ./offline-sync-architecture.md "Offline-First Mobile Sync Architecture Review"
[4]: ../../drizzle/0008_living_skaar.sql "WP2 Migration"
[5]: ../../drizzle/schema.ts "WP2 Data Model"

---

### Presenter notes

The deck distinguishes verified completion from implementation intent. It should not be used to imply that the complete foreman lifecycle or all Phase 2 work packages are delivered.
