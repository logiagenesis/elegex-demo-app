# Migration and Reseed Runbook

> Follow this order for every schema change. Do not apply hand-written production DDL before the Drizzle schema and generated migration agree.

1. Update `drizzle/schema.ts`, including tenant ownership, indexes, and logical deletion behavior.
2. Run `pnpm drizzle-kit generate` and inspect the generated SQL under `drizzle/`.
3. Confirm additive ordering, index names, uniqueness implications, and absence of destructive changes.
4. Apply the reviewed SQL through the managed migration channel.
5. Verify the change using targeted, read-only tenant integrity queries.
6. Extend data-layer or procedure tests before shipping application code that relies on the change.
7. Run `pnpm verify`, capture release evidence, and create a checkpoint.

## Synthetic demonstration reset

The owner/admin **Reset demo data** control uses the same audited dependency order documented in [Database Integrity Audit](database-integrity-audit.md): child release/quote/outbox/job rows are removed before parents, tenant settings are removed before reseeding, and one global labelled synthetic workspace is rebuilt. The managed object store does not expose a direct deletion primitive; removed document metadata makes those synthetic object references unreachable.

## Required evidence

| Change type | Minimum verification |
|---|---|
| Tenant relationship | Cross-tenant rejection test and tenant-scoped positive test |
| Unique key/index | Preflight duplicate check and post-migration index inspection |
| State transition | Allowed and rejected transition tests plus activity/audit evidence |
| Storage metadata | Safe managed key, MIME/size policy, and unavailable-file state |
| User-facing feature | Production build, route render, responsive check, and client-error review |
