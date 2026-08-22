# Supplied UX Reference Analysis

## Reference characteristics

The supplied `elegex-ux-mocks.vercel.app` reference is an unindexed, single-file static review deck rather than an application. It contains hand-authored markup, inline CSS, and a small vanilla JavaScript layer used only for screen switching. It has no database, API calls, state persistence, authentication, file handling, or working workflow mutations.

Its presentation uses a mobile foreman flow and a desktop office flow. The mocked foreman sequence comprises consent, today, job card, check-in, camera, materials, quote, signature, completion, and sync screens. The office sequence presents dashboard, job list, job creation, job card, calendar, invoicing, QuickBooks linking, and quotes.

## Deliberate application interpretation

Elegex is implemented as a global, authenticated, multi-tenant operations application, not as a regional mock deck. The reference’s former regional label, locale, and provincial identity are intentionally not inherited. The working product uses global identity, UTC defaults, neutral locations, generic USD display, and the user-supplied metallic E mark with its baked background removed.

| Reference capability                               | Reference state               | Current Elegex state                                                                                                  | Audit disposition                |
| -------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Office dashboard and job register                  | Static presentation           | Tenant-scoped Recharts dashboard, job register, dispatch, reporting, invoices, documents, and administration          | Implemented and verified         |
| QuickBooks invoice link                            | Static screen                 | Protected invoice-link mutation with tenant validation, idempotent external reference constraint, and activity record | Implemented and hardened         |
| Quotes and six-month history                       | Static content                | Database-seeded global synthetic jobs, quotes, invoices, snapshots, evidence, and reporting                           | Implemented and verified         |
| Foreman today and job execution                    | Static mobile screen sequence | Job detail, evidence visibility, materials, and dispatch exist; dedicated foreman workflow is incomplete              | In active implementation backlog |
| Consent, check-in/out, signature, completion, sync | Static mobile screen sequence | Database supports selected timestamps/evidence states but no complete interactive foreman route yet                   | In active implementation backlog |

## Implementation principle

The static deck is treated as visual and functional intent, never as a reason to introduce fake controls. Each retained field workflow must be backed by tenant-scoped persistence, protected role checks, explicit state transitions, and automated coverage. The next delivery phase converts the remaining mobile foreman intent into working global application flows rather than reproducing a presentation-only prototype.
