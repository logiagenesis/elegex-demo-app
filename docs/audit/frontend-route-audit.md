# Frontend Route Audit

> **Audit environment:** authenticated owner workspace on the managed development preview, 1280 × 720 desktop viewport, 21 August 2026. This record distinguishes visually verified behavior from public-production verification still scheduled in the release checklist.

| Route group | Routes checked | Observed state |
|---|---|---|
| Command centre | `/` | Command centre, six-month synthetic operations metric cards, chart, invoice queue, and navigation render. |
| Field operations | `/jobs`, `/jobs/1`, `/dispatch` | Job register, single job evidence/invoice workspace, and foreman dispatch board render. |
| Records | `/contacts`, `/contacts/1`, `/projects`, `/cases` | Search/filter registries and record-detail layouts render; linked document and activity empty states are explicit. |
| Work and documents | `/tasks`, `/documents` | Task queue, edit affordances, document filters, upload action, and synthetic document list render. |
| Insights | `/reports`, `/notifications` | Recharts reporting and CSV-export control render; notification feed renders a tenant-scoped event. |
| Privileged views | `/staging`, `/admin`, `/settings` | Release evidence, membership controls, demo reset control, audit trail, and UTC workspace settings render for the owner role. |
| Unknown URL | `/does-not-exist` | A visible 404 card with an active home action renders inside the navigation shell. |

## Recovery states

The root error boundary gives every unexpected rendering failure a non-sensitive recovery identifier and retry, return, and reload options. The route-scoped lazy-load boundary isolates feature chunk failures and leaves the navigation shell usable. The unauthenticated entry is independent of tenant queries and presents the sign-in action plus global product context without requiring an established workspace.

## Role-routing expectations

| Role | Standard workspace routes | Controlled job actions | Administration, staging, and settings navigation |
|---|---|---|---|
| Viewer | Read-only records, jobs, dispatch, documents, reporting, and notifications. | Rejected by server. | Hidden; direct route returns restricted state. |
| Member | Standard workspace routes plus create/update work. | Rejected by server. | Hidden; direct route returns restricted state. |
| Manager | Standard workspace routes plus controlled archival and job lifecycle actions. | Allowed where manager capability applies. | Hidden; direct route returns restricted state. |
| Admin / owner | Full workspace and privileged navigation. | Allowed. | Visible and server-authorized. |

The navigation helper is unit-tested for all five roles, while protected procedure tests verify the corresponding server-side rejects and allows. This prevents an interface-only role distinction from becoming a data-access distinction.

## Mobile verification

At a 375 × 812 viewport, the command centre, job register, documents workspace, and unknown-route card rendered with legible headings, non-overlapping controls, accessible navigation trigger, and full-width primary actions. The document filters stack deliberately and the unknown-route recovery action remains visible without requiring horizontal scrolling.

## Foreman workflow verification

The authenticated owner session rendered `/field` as a mobile-first *My field visits* route. The owner’s assigned scheduled job was visible with job number, field address, contact name, stage, and an active **Open workflow** action. This confirms that the route is backed by the current authenticated user’s tenant-scoped assignment query rather than static mock content. Individual state-changing actions remain subject to the protected foreman API contract and will be covered by their dedicated workflow test and release smoke pass.

The synthetic assigned job’s **Start on-site work** action was executed in the authenticated development session. The UI displayed a success confirmation, the job stage changed from **Scheduled** to **In Progress**, and the material, evidence, quote, and completion controls changed from check-in-gated to enabled. This is recorded as controlled synthetic demo activity, not real field activity.

With the visit active, a clearly labelled **Synthetic test isolator** material was entered and submitted. The interface confirmed **Material recorded**, validating the enabled material control, protected mutation, and tenant-scoped persistence path against the synthetic job.

A clearly labelled **Synthetic completion evidence** record was then submitted from the same in-progress field visit. The interface confirmed **Field evidence captured**, demonstrating that the field-evidence action is operational and not a presentation-only mock control.

Finally, a synthetic draft quote (`QT-SYN-2042`, USD 845) was captured against the active field job. The interface confirmed **Draft quote captured for office review**, demonstrating the working commercial handoff rather than a static quote mock.

The managed database subsequently verified the complete synthetic lifecycle for job `#2042`: check-in time, check-out time, and invoice-ready time are recorded; its stage is **ready_for_invoicing**; the synthetic material, evidence, and draft quote are persisted; and audit events show `checked_in`, `material_recorded`, `evidence_captured`, `quote_captured`, and `foreman_completed`. The connected browser timed out only after this server-side completion was already committed, so the final state is evidenced from the tenant database rather than inferred from the browser.

## Route-role policy evidence

The route registry is matched by the exported `workspaceRoutePolicy` test fixture. Every declared destination is listed in the fixture; standard office routes require an authenticated viewer or stronger, `/field` requires a member or stronger, and `/staging`, `/admin`, and `/settings` require an administrator or owner. The direct privileged-route guard uses the same policy helper as the test. The regression suite iterates **every declared route** for anonymous, viewer, member, manager, admin, and owner outcomes, as well as the unknown-route rejection. This makes role expectations explicit and prevents future route additions from bypassing the recorded policy.

## Published authenticated foreman evidence

After a confirmed Manus OAuth callback on the published domain, the owner workspace rendered the `/field` assignment list and its scheduled visit. Opening the job card exposed the live `READY TO SYNC` state, explicit typed-consent artifact instruction, `Before condition`, `After condition`, `Field note`, and `Job card` evidence modes, and the deliberately gated material, evidence, quote, and completion controls before check-in. No synthetic production data was changed during this confirmation pass.

## Remaining validation

The release suite will still repeat the critical routes at a mobile viewport and perform public-domain, asset, client-console, and API-network checks after the final deployment checkpoint.
