# Protected API Contract Map

Elegex uses tRPC rather than public REST endpoints. Client types are derived from `AppRouter`, keeping request and response contracts aligned without duplicated client schemas.

| Domain | Procedures | Minimum role |
|---|---|---|
| Workspace | Current scope, members | Viewer |
| Records | Contacts, projects, cases, task lists and detail | Viewer to read; Member to edit; Manager to archive |
| Documents | Scoped list and upload | Viewer to read; Member to upload |
| Reports | Portfolio rows and persisted views | Viewer to read; Member to save a view |
| Administration | Members, settings, audit log, reset | Owner or Admin |
| Integrations | Health, connection setup, outbox inspection | Owner or Admin |

Each procedure resolves `TenantScope` before entering its domain handler. Validation occurs at the router boundary with Zod, while authorization is asserted server-side with role gates. The procedure-level test suite verifies unauthenticated rejection and allowed/forbidden outcomes across owner, manager, member, and viewer roles.
