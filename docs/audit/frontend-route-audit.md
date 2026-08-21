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

## Unified published-domain verification record

The published domain was reconfirmed on 21 August 2026 using two independent paths. The committed public release smoke suite confirmed the unauthenticated entry, product title, public-recovery marker, expected product copy, loaded runtime assets, and zero captured runtime exceptions. The connected authenticated browser then rendered the owner command centre with six-month analytics, invoice control, live job pipeline, global navigation, and populated tenant-scoped data. The same authenticated production session had already rendered the protected job register and the foreman route after the observed OAuth callback.

| Verification surface | Evidence source | Outcome | Inspection boundary |
|---|---|---|---|
| Public entry and client boot | `pnpm smoke:release` against the published domain | Title, public shell, expected content, and zero runtime exceptions | Browser-protocol runner uses a separate local browser profile. |
| Published OAuth and protected workspace | Connected browser callback and subsequent owner session | OAuth returned to the deployed workspace; command centre and `/jobs` rendered tenant data | Session cookies are intentionally not copied into the smoke runner. |
| Published foreman workflow | Connected browser view of `/field` | Assigned visit, typed-consent instruction, all four evidence modes, and sync surface rendered | No production mutation was issued in this confirmation pass. |
| Responsive route behavior | Development-browser 375 × 812 route checks plus production owner-shell rendering | Mobile navigation, full-width actions, stacked document filters, and recovery route were legible | The published authenticated browser review was desktop-sized; mobile evidence remains a controlled development verification. |
| API and console observability | Public smoke network listener, protected-route response evidence, and structured error boundary | Public runtime exceptions: zero. Protected APIs returned data after OAuth. | The connected browser does not expose DevTools protocol logs to the local smoke target; this boundary is documented rather than inferred. |

This record closes the earlier blank-page remediation verification. It does not claim that every role was exercised on the published domain: published role coverage is represented by the owner session, while the exhaustive five-role matrix is enforced by the shared route-policy and protected-procedure regression suite.

## Exhaustive route-behavior matrix

The route matrix below is generated from the same `workspaceRoutePolicy` that powers the `PrivilegedRoute` guard. The automated regression iterates each row for anonymous, viewer, member, manager, administrator, and owner outcomes; no route is allowed to rely solely on hidden navigation. Representative published-domain evidence consists of the public recovery shell for unauthenticated paths and the owner’s successfully rendered command centre, job register, and foreman route after OAuth.

| Declared route | Anonymous | Viewer | Member | Manager | Administrator | Owner | Evidence classification |
|---|---|---|---|---|---|---|---|
| `/` | Public shell | Allowed | Allowed | Allowed | Allowed | Allowed | **Published:** public shell and owner command centre. **Regression:** all role outcomes. |
| `/jobs` | Public shell | Allowed | Allowed | Allowed | Allowed | Allowed | **Published:** public shell and owner register. **Regression:** all role outcomes. |
| `/jobs/:id` | Public shell | Allowed | Allowed | Allowed | Allowed | Allowed | **Published:** public fallback. **Development:** owner detail layout. **Regression:** all role outcomes. |
| `/field` | Public shell | Restricted | Allowed | Allowed | Allowed | Allowed | **Published:** public shell and owner foreman route. **Regression:** all role outcomes. |
| `/dispatch` | Public shell | Allowed | Allowed | Allowed | Allowed | Allowed | **Published:** public fallback. **Regression:** all role outcomes. |
| `/contacts` | Public shell | Allowed | Allowed | Allowed | Allowed | Allowed | **Published:** public fallback. **Regression:** all role outcomes. |
| `/contacts/:id` | Public shell | Allowed | Allowed | Allowed | Allowed | Allowed | **Published:** public fallback. **Regression:** all role outcomes. |
| `/projects` | Public shell | Allowed | Allowed | Allowed | Allowed | Allowed | **Published:** public fallback. **Regression:** all role outcomes. |
| `/projects/:id` | Public shell | Allowed | Allowed | Allowed | Allowed | Allowed | **Published:** public fallback. **Regression:** all role outcomes. |
| `/cases` | Public shell | Allowed | Allowed | Allowed | Allowed | Allowed | **Published:** public fallback. **Regression:** all role outcomes. |
| `/cases/:id` | Public shell | Allowed | Allowed | Allowed | Allowed | Allowed | **Published:** public fallback. **Regression:** all role outcomes. |
| `/tasks` | Public shell | Allowed | Allowed | Allowed | Allowed | Allowed | **Published:** public fallback. **Regression:** all role outcomes. |
| `/documents` | Public shell | Allowed | Allowed | Allowed | Allowed | Allowed | **Published:** public fallback and managed-document URL. **Regression:** all role outcomes. |
| `/reports` | Public shell | Allowed | Allowed | Allowed | Allowed | Allowed | **Published:** public fallback. **Regression:** all role outcomes. |
| `/notifications` | Public shell | Allowed | Allowed | Allowed | Allowed | Allowed | **Published:** public fallback. **Regression:** all role outcomes. |
| `/staging` | Public shell | Restricted | Restricted | Restricted | Allowed | Allowed | **Published:** public fallback. **Regression:** direct guard and all role outcomes. |
| `/admin` | Public shell | Restricted | Restricted | Restricted | Allowed | Allowed | **Published:** public fallback. **Regression:** direct guard and all role outcomes. |
| `/settings` | Public shell | Restricted | Restricted | Restricted | Allowed | Allowed | **Published:** public fallback. **Regression:** direct guard and all role outcomes. |
| Unknown route | Visible 404 | Visible 404 | Visible 404 | Visible 404 | Visible 404 | Visible 404 | **Development:** responsive 404. **Regression:** unknown-path rejection for every role. |

## Expanded public release-smoke result

The committed `pnpm smoke:release` suite was expanded and executed against the published domain on 21 August 2026. It exercised `/`, `/jobs`, `/documents`, `/reports`, and `/field` without a session; each returned the intentional public recovery shell with the correct title, expected product copy, and no failed application asset response. The same run emulated a 375 × 812 mobile viewport, confirmed the public sign-in control remained visible, and detected no horizontal overflow. It also resolved the managed synthetic job-card document with HTTP `200` and captured zero browser runtime exceptions.

Browser-profile blocking events (`net::ERR_BLOCKED_BY_CLIENT` for analytics/ping resources) were observed by the isolated smoke browser but did not prevent any app route, first-party asset, document link, or `auth.me` request from succeeding. They are recorded as profile-level blocking noise, not product failures. The smoke browser is intentionally unauthenticated; the connected browser’s published owner session provides the separate authenticated route evidence described above.

### Authenticated foreman job-card observation

On 21 August 2026, the connected published owner session opened the assigned `#2041 · Emergency lighting compliance visit` job card. The page displayed **READY TO SYNC**, a no-pending-actions confirmation, the typed-consent signer input and managed immutable-artifact instruction, a ready check-in control, check-in-gated material/evidence/quote/completion controls, and the selectable **Before condition**, **After condition**, **Field note**, and **Job card** evidence modes. This is a live published authenticated UI observation; it confirms the operational foreman surface and its visible recovery/gating states without performing a new production mutation.
