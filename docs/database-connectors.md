# Database Connector and Integration Outbox

The database connector layer is intentionally small, explicit, and dependency-free. It exists to make the data plane legible to reviewers and extensible to production integrations without turning route handlers into infrastructure code.

## Connector responsibilities

| Module | Guarantee | Primary API |
|---|---|---|
| `database.ts` | One lazy client per process, explicit transaction boundary, readiness probe. | `getDatabase`, `withTransaction`, `checkDatabaseHealth` |
| `audit.ts` | Durable, tenant-scoped evidence for business mutations. | `writeAuditEvent` |
| `outbox.ts` | Idempotent connection configuration and durable event scheduling. | `upsertIntegrationConnection`, `enqueueIntegrationEvent` |
| `storage.ts` | Object-storage adapter with sanitized keys and signed access. | `storagePut`, `storageGet` |

## Integration model

`integrationConnections` stores the organization-specific configuration for a supported connector category—database, webhook, analytics, or storage. The `configuration` JSON must contain only safe operational metadata. Credentials never live in this table; use `secretReference` to point to platform-managed secret configuration.

`integrationEvents` implements the transactional outbox pattern. Events include an immutable payload, idempotency key, dispatch status, attempt count, availability timestamp, and error metadata. The uniqueness constraint on `(connectionId, idempotencyKey)` protects downstream systems from duplicate logical deliveries.

## Operating a dispatcher

The repository intentionally does not run an always-on worker in the web process. A future worker should fetch pending events through `listDispatchableEvents`, claim them atomically, deliver the external request, and update the status to `delivered` or `failed`. This keeps deployment compatible with request-based hosting while preserving a production-ready integration boundary.

## Security invariants

> The caller never supplies an organization ID for protected application operations.

Integration procedures require owner or administrator membership. Connection configuration is organization-scoped, secret values remain outside the database, audit records document meaningful mutations, and all background-facing work is idempotent by design.
