# Protected API Contract Map

Elegex uses tRPC rather than public REST endpoints. Client types are derived from `AppRouter`, keeping request and response contracts aligned without duplicated client schemas.

| Domain         | Procedures                                       | Minimum role                                       |
| -------------- | ------------------------------------------------ | -------------------------------------------------- |
| Workspace      | Current scope, members                           | Viewer                                             |
| Records        | Contacts, projects, cases, task lists and detail | Viewer to read; Member to edit; Manager to archive |
| Documents      | Scoped list and upload                           | Viewer to read; Member to upload                   |
| Reports        | Portfolio rows and persisted views               | Viewer to read; Member to save a view              |
| Administration | Members, settings, audit log, reset              | Owner or Admin                                     |
| Integrations   | Health, connection setup, outbox inspection      | Owner or Admin                                     |

Each procedure resolves `TenantScope` before entering its domain handler. Validation occurs at the router boundary with Zod, while authorization is asserted server-side with role gates. The procedure-level test suite verifies unauthenticated rejection and allowed/forbidden outcomes across owner, manager, member, and viewer roles.

## Typed client examples

The React application consumes generated client contracts rather than manually assembling HTTP requests:

```tsx
// Query only the current user's tenant-derived field assignments.
const visits = trpc.elegex.fieldService.foreman.today.useQuery();

// A member can record a material only for their assigned, in-progress job.
const material = trpc.elegex.fieldService.foreman.material.useMutation();
material.mutate({
  jobId: 42,
  description: "Circuit isolator",
  quantity: 1,
  unit: "each",
});
```

```tsx
// Managed document uploads are validated before object storage is touched.
const upload = trpc.elegex.documents.upload.useMutation();
upload.mutate({
  fileName: "inspection-brief.pdf",
  mimeType: "application/pdf",
  dataUrl: "data:application/pdf;base64,...",
  projectId: 7,
});
```

All examples inherit the signed session cookie. They omit `organizationId` intentionally: the server derives it from the active membership. For the exact procedure inventory and guardrails, see [Protected Procedure Catalogue](procedure-catalogue.md).
