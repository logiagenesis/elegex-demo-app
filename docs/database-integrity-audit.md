# Database Integrity Audit

> **Scope:** This audit covers tenant boundaries, relationship validation, database uniqueness, soft-delete behavior, outbox idempotency, document linkage, and release-evidence integrity for the Elegex demonstration workspace.

## Design decision: application-enforced tenant relationships

The relational schema intentionally does **not** declare database foreign keys. This makes tenant resets and isolated demo provisioning portable across the managed TiDB/MySQL environment while avoiding cross-tenant cascade risks. The corresponding control is enforced in the database helper layer: any related identifier supplied to a write operation is re-queried using both its primary key and the active `organizationId` before the dependent record is written.

| Relationship-bearing workflow | Required scoped validation | Write boundary |
|---|---|---|
| Project creation | Optional contact must be a live contact in the active tenant. | Transaction plus activity record. |
| Case creation/update | Contact and project must be live tenant records; owner must be an active tenant member. | Transaction plus activity record. |
| Task creation/update | Project and case must be live tenant records; assignee must be an active tenant member. | Transaction with notification and activity record. |
| Job creation | Contact must be a live tenant contact; foreman must be an active tenant member; scheduling end must follow start. | Transaction with optional dispatch visit and activity record. |
| Invoice link | Job must be a live tenant job already in `ready_for_invoicing`. | Transaction with job stage update and activity record. |
| Document upload | Exactly one optional target; target must be a live tenant contact, project, or case before storage write. | Preflight validation, then transaction for metadata and activity record. |
| Outbox enqueue/read | Connection must belong to the active tenant; enqueue requires active connection status; event read applies both tenant and connection predicates. | Connector-owned scoped query. |

## Constraint and index inventory

| Area | Constraint or index | Protection provided |
|---|---|---|
| Membership | `member_organization_user_unique` | Prevents duplicate memberships for the same user in one organization. |
| Projects | `project_organization_code_unique` | Prevents duplicate active project codes within one tenant. |
| Cases | `case_organization_reference_unique` | Prevents duplicate case references within one tenant. |
| Jobs | `job_organization_number_unique` | Prevents duplicate job numbers within one tenant. |
| Quotes | `quote_organization_number_unique` | Prevents duplicate quote numbers within one tenant. |
| Invoice links | `invoice_link_external_reference_unique` | Prevents the same external invoice reference from being imported twice within one tenant. |
| Documents | `document_organization_storage_key_unique` | Prevents a storage object from being referenced twice in the same tenant. |
| Snapshots | `monthly_snapshot_organization_period_unique` | Enforces one operational snapshot per tenant and period. |
| Connectors | `integration_connection_unique` | Prevents duplicate provider/name registrations within one tenant. |
| Outbox | `integration_event_idempotency_unique` | Allows safe retry semantics per integration connection. |
| Link traversal | `task_project_idx`, `task_case_idx`, `document_*_idx`, `job_visit_*_idx`, `job_*_idx` | Keeps tenant-scoped operational reads efficient and predictable. |

## Soft-delete rules

Contacts, projects, cases, tasks, and jobs are logically removed with `deletedAt`. Read and mutation predicates used by the workspace exclude soft-deleted records, and all relationship guards reject deleted targets. Documents, evidence, invoices, release evidence, outbox records, and snapshots are retained as immutable operational history until an explicit synthetic-demo reset.

## Reset and reseed integrity

The privileged reset flow deletes child rows before their parents: release checks before releases, quote items before quotes, integration events before integration connections, then operational job children before jobs, and finally workspace records. Managed document keys become unreachable when their metadata is removed; the storage adapter intentionally does not expose a direct deletion endpoint. The reset then reseeds one labelled synthetic workspace without crossing organization boundaries.

## Release evidence integrity

Release records are organization-scoped. Release checks reference a single release and are removed before a release reset. The staging-readiness query first selects tenant-owned releases and only then loads checks for the newest returned release, so evidence cannot be requested by arbitrary release ID.

## Verification record

The audit’s migration changes are recorded in `drizzle/0006_remarkable_lester.sql` and `drizzle/0007_flippant_thunderball.sql`. Before the uniqueness migration was applied, duplicate checks for project codes, case references, external invoice references, and document storage keys returned no conflicts. The continuous test suite covers protected procedure authorization, document preflight behavior, invoice workflow routing, connector transaction behavior, and production builds.
