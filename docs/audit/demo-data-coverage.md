# Synthetic Demo Data Coverage

> **Purpose:** Elegex ships a clearly labelled, global, tenant-isolated synthetic dataset for demonstrations. It does not contain live customer, financial, or operational records.

## Verified coverage

| Entity            | Expected records |   Live verification | Coverage purpose                                                                                |
| ----------------- | ---------------: | ------------------: | ----------------------------------------------------------------------------------------------- |
| Reporting periods |                6 | 6 monthly snapshots | Six consecutive operational months.                                                             |
| Jobs              |               36 |                  36 | Six jobs per month across planned, active, held, invoice-ready, invoiced, and cancelled states. |
| Dispatch visits   |               36 |                  36 | One scheduled field visit for each job.                                                         |
| Materials         |               72 |                  72 | Two material lines per job, covering catalog and free-text sources.                             |
| Evidence          |               72 |                  72 | Before-condition and completion/note evidence for every job.                                    |
| Quotes            |               12 |                  12 | Pricing-needed, sent, and accepted commercial paths.                                            |
| Invoice links     |               23 |                  23 | External invoice references for invoice-complete jobs.                                          |
| Release records   |                3 |                   3 | Development, staging, and production release evidence with check records.                       |

The live count verification was executed against the managed database on 21 August 2026. The exact expectation object is source controlled as `DEMO_DATA_EXPECTATIONS` in `server/db.ts` and is guarded by the Vitest suite.

## Global fixture policy

The demo uses `.demo` email domains, neutral North/South/East/West district descriptors, UTC time defaults, generic USD labels where currency display is needed, and fictional organizations. It does not mention a province, country-specific currency, local timezone, or local telephone format.

## Reset behavior

The owner/admin reset operation clears the active tenant’s synthetic child records before parent records, removes document metadata (thereby removing object references), clears integration outbox and connection rows, and reseeds the exact demo lifecycle. It cannot target another organization because the server derives the tenant from the authenticated membership.

## Reviewer shortcuts

Read the [database integrity audit](../database-integrity-audit.md) for deletion-order rationale and the [procedure catalogue](../procedure-catalogue.md) for the protected `admin.resetDemo` contract.
