# Elegex Operations Workspace

Elegex is a refined, multi-tenant business-management demonstration app built with React, TypeScript, Tailwind CSS, Express, tRPC, Drizzle, and the managed MySQL/TiDB database. It combines protected workspaces with live portfolio dashboards, contacts, projects, cases, tasks, documents, notifications, reports, and administration.

## Access and demonstration use

Authentication uses **Manus OAuth**. There is no shared demo password: sign in with any Manus account and Elegex automatically provisions a private demonstration workspace for that account on its first login. The workspace is seeded with realistic professional-services data and additional sample manager, member, and viewer profiles for role-management demonstrations. This approach keeps each person’s demo data isolated rather than exposing one shared account.

| Demonstration profile | Role | Access model |
|---|---|---|
| Signed-in Manus account | Owner | First login creates an owner membership and the full seeded workspace. |
| Mila Petersen | Manager | Seeded sample member; can manage operational records but not administration. |
| Jordan Okoro | Member | Seeded sample member; can create and update operational records. |
| Sana Davids | Viewer | Seeded sample member; read-only access. |

## Key capabilities

The app enforces organization scoping in every protected server procedure. Each CRUD query receives the current user’s workspace scope before it accesses contacts, projects, cases, tasks, documents, saved views, activity records, and notifications. Owners and administrators alone can open administration procedures, which are separately enforced on the server as well as hidden from ordinary navigation.

Document uploads use managed object storage. The database only retains the document filename, MIME type, byte size, storage key, and secure storage URL; file bytes are never stored in relational tables. Reports are generated from live project records and can be downloaded as CSV directly from the Reports view.

## Local development

The required platform variables are injected into the managed environment, including `DATABASE_URL`, `JWT_SECRET`, `VITE_APP_ID`, `OAUTH_SERVER_URL`, and the managed-storage configuration. Do not commit a `.env` file containing their values.

```bash
pnpm install
pnpm dev
```

To validate the project, run the following commands.

```bash
pnpm check
pnpm test
```

## Database and seeding

Schema definitions are maintained in `drizzle/schema.ts`. Generate migrations with Drizzle, inspect the generated SQL, and apply it through the managed database migration workflow. The `scripts/seed-demo.mjs` script can create a named `elegex-demo` workspace for a specified owner in environments where a standalone seed is preferred.

```bash
SEED_OPEN_ID=your-demo-owner pnpm seed:demo
```

For the deployed demo, no manual seed command is necessary: a first successful OAuth sign-in triggers secure workspace provisioning and realistic seed data. Owners and administrators can restore the original operational data from **Administration → Reset demo data**.

## Project structure

| Location | Responsibility |
|---|---|
| `drizzle/schema.ts` | Tenant-aware database schema and role-bearing membership model. |
| `server/db.ts` | Tenant scope resolution, audited data helpers, first-workspace seeding, and record queries. |
| `server/routers/elegex.ts` | Protected tRPC contracts and server-side authorization gates. |
| `client/src/components/DashboardLayout.tsx` | Role-aware navigation, OAuth entry screen, and workspace shell. |
| `client/src/pages/ElegexPages.tsx` | Dashboard, CRUD interfaces, tasks, documents, notifications, reports, and administration. |
| `scripts/seed-demo.mjs` | Standalone realistic database seed for an explicitly selected owner. |

## Security notes

Role enforcement does not rely on the frontend. The server resolves the signed-in user’s `organizationId` and membership role before every protected procedure, and every list, mutation, upload, notification, report, and administration query is constrained to that organization. Viewers cannot mutate records; managers cannot access workspace administration; only owners and administrators can alter membership roles, settings, or reset the demo data.
