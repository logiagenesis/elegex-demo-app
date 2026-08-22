# Production Operations and Release Verification

> This guide describes the operating expectations for Elegex. It does not claim that the synthetic demonstration workspace is a production customer environment.

## Readiness and liveness

| Signal             | Expected result                                                                                                                               | Response if it fails                                               |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Public entry       | The global sign-in shell renders without tenant or OAuth data.                                                                                | Check deployed HTML/assets and the client recovery identifier.     |
| OAuth callback     | A signed-in user returns to the tenant workspace.                                                                                             | Confirm callback configuration and session-cookie domain settings. |
| Database readiness | The privileged connector health check returns `{ healthy: true }`.                                                                            | Inspect database connectivity, credentials, and migration state.   |
| Core routes        | Dashboard, jobs, field visits, records, documents, reports, staging, and administration show typed loading, empty, error, or recovery states. | Review route-specific chunk/load errors and server logs.           |
| Storage metadata   | Documents have a managed key and `/manus-storage/` reference before download is enabled.                                                      | Mark the file unavailable; do not imply a broken link works.       |

## Client recovery capture

The root recovery boundary generates an `ELX-*` identifier, writes a message/path/timestamp record to console output, and keeps the last recovery record in browser session storage under `elegex:last-client-recovery`. It intentionally excludes tokens, session cookies, document contents, and stack details. Support staff can request the identifier and route from an affected user without requesting sensitive data.

## Release checklist

1. Run `pnpm verify` locally; a TypeScript, test, or production-build failure blocks release.
2. Run `pnpm smoke:release` from an environment with a debuggable Chromium instance to verify the published public entry has visible content and no runtime exception. The August 2026 recovery release passed this check.
3. Check the public entry on the published domain before OAuth and confirm logo, global copy, and sign-in action are visible.
4. With an authorized account, exercise an office route and an assigned field route, then inspect browser-console errors.
5. At a mobile viewport, check navigation, primary actions, and empty/recovery states.
6. Run the staging-readiness checklist and record only real environment evidence for any external launch.
7. Review managed deployment logs and the client recovery record if a route fails.

## Rollback criteria

Rollback to the last verified checkpoint if the public entry becomes blank, authentication loops, a protected route fails to recover after refresh, a migration causes tenant reads or writes to fail, or a release introduces a client recovery boundary event that cannot be remedied safely. Preserve release evidence and the recovery identifier before rollback. Database schema/data changes require a separately reviewed forward migration; code rollback does not reverse database data.

## Post-deploy monitoring

For the managed deployment, inspect runtime logs after release and after the first authenticated workspace use. Watch for OAuth callback errors, tRPC authorization failures, storage redirect failures, or repeated `ELX-*` recovery identifiers. Any production integration connection should use a secret reference and its own idempotency keys, never a credential stored in business data.
