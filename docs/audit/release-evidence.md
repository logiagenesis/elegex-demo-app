# Release Evidence: Unified Elegex Demo

**Audit scope:** brand alignment, tenant isolation, role-gated workflows, field-service lifecycle, synthetic six-month history, documents, commercial reporting, staging controls, repository documentation, and GitHub export readiness.

## Evidence summary

| Audit area | Verified evidence | Result |
|---|---|---|
| Brand | The application uses the uppercase **ELEGEX** wordmark and the cleaned transparent version of the user-supplied metallic E mark within a global field-service identity. | Passed |
| Unified product | Office overview, job register, dispatch, clients, programmes, exceptions, tasks, documents, commercial reporting, staging, and administration live under one workspace navigation shell. | Passed |
| Multi-tenancy | All feature procedures resolve server-side organization membership before accessing a business table; client inputs never provide the organization identifier. | Passed |
| RBAC | Owner, admin, manager, member, and viewer capabilities are tested. Administration, integration, staging, and managed job controls reject unauthorized users. | Passed |
| Job lifecycle | Jobs support scheduled, in-progress, on-hold, ready-for-invoicing, invoiced, and cancelled stages. Hold/cancel transitions demand a reason and emit an activity record. | Passed |
| Six-month history | The active synthetic tenant contains **36 jobs**, **36 visits**, **72 materials**, **72 evidence records**, **12 quotes**, **24 quote items**, **23 invoice links**, and **6 monthly snapshots**. | Passed |
| Documents | Three working managed synthetic documents are present: a job card, a quote, and a safety checklist. Uploads remain organization-scoped. | Passed |
| Reporting | The command centre and commercial report use Recharts against live database records; CSV export is available from commercial reporting. | Passed |
| Connectors | The repository contains database, audit, and outbox connector modules plus two seeded connector configurations. | Passed |
| Staging | Three synthetic environment releases and five staging verification checks back a privileged staging-readiness screen and repository runbook. | Passed |
| Responsive UI | Desktop views were inspected for overview, jobs, dispatch, records, documents, reports, staging, and administration. Mobile views were inspected for overview, jobs, documents, and the unknown-route recovery card. | Passed |
| Public recovery | On 21 August 2026, the published `elegexapp-jvc9dhln.manus.space` entry rendered the user-supplied metallic mark, global job-management content, sign-in card, and synthetic-workspace explanation rather than the prior blank page. A follow-up connected-browser view timed out after the rendered response, which is classified as browser-extension transport noise rather than an application failure. | Passed |
| Published browser smoke | The committed `pnpm smoke:release` browser-protocol suite loaded the published entry, confirmed the expected title and `data-testid=public-entry` shell, found the visible global product content, and reported **zero** runtime exceptions. | Passed |
| Production OAuth and protected route | The published sign-in launched the Manus `/app-auth` flow with the deployed callback URI and one-time state, then returned to the authenticated owner workspace. The published `/jobs` route subsequently rendered the complete tenant-scoped job register through its protected API. | Passed |
| Build quality | The latest `pnpm verify` passed: TypeScript, five Vitest files with 24 tests, and the production bundle all completed successfully. The unsafe manual React chunk split was removed after it caused a public blank-page failure; the production bundle now mounts successfully. | Passed |

## Important interpretation boundary

> The business names, dates, field activity, invoice references, quality indicators, release records, and documents are synthetic demo fixtures. They demonstrate data relationships and product capability; they are not claims about real customers, financial performance, service outcomes, or release certification.

## Production handoff boundary

The repository is ready to export as one application. The latest published milestone checkpoint is **`2053f5bd`**; subsequent route, document-health, seed-evidence, and release-audit work remains in progress for the final checkpoint. Before an external production launch, replace synthetic seed data, configure real OAuth and storage settings, provision database backups, set least-privilege credentials, retain the user-supplied transparent logo asset, and execute the staging runbook with actual environment evidence.
