# Developer Code Audit: WP2/WP5 Foundation

**Audience:** Senior Python and backend developer reviewer
**Assessment date:** 21 August 2026
**Scope:** WP2 domain migration, foreign-key integrity, and the WP5 TypeScript IndexedDB queue/idempotency foundation.

> **Audit conclusion:** The queue and idempotency foundation is type-check clean and has four passing focused unit tests. The WP2 migration and subsequent physical foreign-key migration were applied to an isolated MariaDB test database. The implementation is **not** a completed end-to-end offline foreman workflow: the production foreman screen has not yet been wired to the queue transport, binary upload path, or server-side location/consent/completion rules.

## 1. Database Migration and Referential Integrity

Migration `0008_living_skaar.sql` successfully created the WP2 domain foundation: `callOutTypes`, `clients`, and `sites`; it extended `appSettings` with `locale`, `currency`, and `timezone`; and it added `clientId`, `siteId`, and `callOutTypeId` to `jobs`. The isolated test database applied **ten** migration records through `0010_groovy_gwen_stacy.sql`.

The later `0010` migration adds physical database constraints that were absent from the earlier generated schema. This matters to a backend reviewer: without foreign keys, application-level tenant checks are a convention; with them, missing-parent records are rejected by the database engine.

| Relationship | Database constraint | Verification result |
|---|---|---|
| Client → organization | `clients_organization_fk` | Present in `information_schema` |
| Client → billing entity | `clients_billing_entity_fk` | Present in `information_schema` |
| Site → organization | `sites_organization_fk` | Present in `information_schema` |
| Site → client | `sites_client_fk` | Present; invalid client insert rejected |
| Site → contact | `sites_contact_fk` | Present in `information_schema` |
| Call-out type → organization | `call_out_types_organization_fk` | Present in `information_schema` |
| Job → client | `jobs_client_fk` | Present in `information_schema` |
| Job → site | `jobs_site_fk` | Present in `information_schema` |
| Job → call-out type | `jobs_call_out_type_fk` | Present; invalid call-out insert rejected |

The test inserted a valid organization → client → site → call-out type → job chain. It then attempted two invalid child writes. MariaDB rejected the invalid site with error `1452` under `sites_client_fk` and the invalid job call-out reference with error `1452` under `jobs_call_out_type_fk`. The raw evidence is stored in `docs/audit/wp2-relationship-verification.log`.

### Important tenant-isolation caveat

These single-column foreign keys establish parent existence, **not same-tenant composition**. For example, a job from organization A could theoretically reference a globally unique client row belonging to organization B if server-side scope checks were missing. The existing design must therefore retain tenant predicates and add explicit `organizationId` consistency guards at every create/update mutation. A composite foreign-key strategy would require composite unique keys such as `(organizationId, id)` on all referenced tables; this should be considered in the WP9 hardening package.

## 2. Idempotency Handler Review

The server adds `syncLogs`, with a unique constraint on `(organizationId, idempotencyKey)`. Foreman mutation contracts now accept an optional UUID idempotency key for check-in, materials, evidence, quote capture, and completion.

The `checkIdempotency` helper claims the key **inside the same database transaction** as the business mutation:

```typescript
const result = await tx.insert(syncLogs)
  .values({ organizationId, idempotencyKey, mutationType })
  .onDuplicateKeyUpdate({ set: { idempotencyKey: sql`${syncLogs.idempotencyKey}` } });
return Number(result[0].affectedRows) === 0;
```

This is stronger than a read-then-insert pattern. The composite unique index is the concurrency gate: one transaction inserts the claim and runs the work; a replay observes a duplicate-key no-op and returns without running the work. If the original transaction rolls back, the claim also rolls back, allowing a later retry. This closely corresponds to a Python service using `INSERT ... ON CONFLICT DO NOTHING` within the same transaction.

| Control | Result | Review note |
|---|---|---|
| Tenant-bound key | Implemented | Same UUID may safely appear in different organizations. |
| Transactional claim | Implemented | Claim and business mutation share `withTransaction`. |
| Replay path | Implemented | Handler returns without duplicate business writes. |
| Contract validation | Implemented | tRPC accepts a validated UUID when supplied. |
| Mandatory client adoption | **Not yet implemented** | Key is optional and the existing foreman page is not wired to the queue. |
| Response replay payload | Not yet implemented | API returns a safe no-op, not an original response envelope. |

## 3. IndexedDB Write-Ahead Queue Review

`client/src/lib/syncQueue.ts` is a browser-native implementation and deliberately avoids a new runtime library. It uses IndexedDB's structured clone semantics, so future photo and signature `Blob` payloads can persist without base64 conversion.

| Queue concern | Implemented control |
|---|---|
| Durability before network | `enqueue` persists the queue row before invoking `drain`. |
| Reboot/tab-crash recovery | `recoverInterruptedWork` converts stale `syncing` rows to idempotent retries. |
| Stable idempotency | Each row is assigned `crypto.randomUUID()` and transport receives the same mutation ID on every attempt. |
| Ordered workflow | Dependency IDs prevent child actions from dispatching before succeeded parents. |
| Transient network faults | Exponential backoff plus jitter; retry count is durable. |
| Permanent faults | A capped retry count marks work `failed` with an actionable error. |
| Failed dependency | Dependent rows become actionable failures rather than causing an empty-drain loop. |
| Concurrent drains | `drainPromise` coalesces concurrent browser hooks into one drain loop. |

Four targeted Vitest checks pass: write-ahead UUID persistence, dependency ordering, same-key retry behaviour, and permanent dependency-failure handling.

## 4. Required Follow-up Before Production Acceptance

The following gaps are intentionally open and should be considered blocking for a production offline claim.

1. **Wire the transport.** `SyncQueue` is transport-agnostic by design. `ForemanPage.tsx` must enqueue all commands and adapt each row to the appropriate tRPC mutation, always sending `idempotencyKey: mutation.id`.
2. **Make idempotency mandatory for syncable mutations.** Once the client path is switched, change `idempotencyKey` from optional to required in the server schemas to prevent accidental direct writes without replay protection.
3. **Implement Blob upload staging.** Blob payloads should upload to a tenant/job/type storage key before the evidence mutation. The present server evidence endpoint only records metadata and does not accept a binary artifact.
4. **Test the server constraint under contention.** Add a database-integrated test that fires two concurrent mutations with the same key and asserts one business write and one `syncLogs` row.
5. **Preserve tenant scope.** Add mutation guards that assert a referenced client, site, and call-out type all belong to the server-derived organization. Foreign keys alone do not provide this guarantee.
6. **Separate foreman pricing.** `captureForemanQuote` currently retains a monetary total in the foreman router; this conflicts with BR-021 and needs the dedicated foreman/office response split required by WP3.

## 5. Validation Evidence

| Check | Result |
|---|---|
| `pnpm check` | Passed after implementation |
| `pnpm vitest run client/src/lib/syncQueue.test.ts` | Passed: 4 tests |
| WP2 migration application | Passed on isolated `elegex_test` MariaDB database |
| Valid parent-child relationship chain | Passed |
| Invalid site client reference | Rejected by MariaDB FK `1452` |
| Invalid job call-out reference | Rejected by MariaDB FK `1452` |

The evidence supports a **tested foundation**, not a complete end-to-end offline foreman release.
