# Deployment and Local Operations

Elegex runs as one Node service with a MySQL-compatible database. The service exposes `/healthz` for process liveness, `/readyz` for database readiness, and `/metrics` for low-cardinality operational metrics. Protected application routes return crawler-blocking headers, while the public landing is the sole sitemap entry.

## Zero-account local demonstration

The Compose stack uses a local MariaDB container, the **demo** authentication provider, local-only file storage, and no-op AI and notification providers. It never requires an OAuth, S3, SMTP, webhook, or AI account.

```bash
docker compose up --build
```

Open `http://localhost:3000`, choose **Sign in**, and select a role-scoped demo persona. The `migrate` service applies the committed Drizzle migration sequence before the application starts. It does not call schema push or auto-generate SQL.

## Production deployment

Use the root `Dockerfile` to build a non-root Node 22 image. The image builds the browser bundle and server artifact, retains runtime dependencies and migration files, and starts `dist/index.js` on the runtime-provided `PORT`. Deploy the application with an encrypted secret manager rather than an `.env` file.

Before release, generate any new migration, inspect the SQL, apply it to the target database, and then deploy the matching application revision. Do not substitute `drizzle-kit push` for a reviewed migration in a persistent environment.

```bash
pnpm db:generate
# inspect drizzle/<new-migration>.sql
pnpm db:migrate
pnpm verify
```

## Provider choices

| Concern        | Safe default | Optional modes             | Guardrail                                                                                       |
| -------------- | ------------ | -------------------------- | ----------------------------------------------------------------------------------------------- |
| Authentication | `manus`      | `demo`, `oidc`, `dev`      | `dev` is refused in production; demo remains role-scoped.                                       |
| Storage        | `manus`      | `s3`, `local`              | Local storage is refused in production; all uploads use validation and immutable keys.          |
| Notifications  | `manus`      | `webhook`, `email`, `noop` | Optional credential modes fail configuration validation when selected without secrets.          |
| AI             | `noop`       | `anthropic`                | Organisation opt-in, daily token budget, retries, usage logging, and human review are required. |

The variable names and non-secret examples are maintained in [`config/environment.template`](../config/environment.template). Configure real values only through the target deployment’s secret manager.

## Operational checks

```bash
curl -fsS http://localhost:3000/healthz
curl -fsS http://localhost:3000/readyz
curl -fsS http://localhost:3000/metrics
```

The metrics endpoint deliberately reports aggregate process and HTTP status-family counters only. In production, callers must supply `Authorization: Bearer <METRICS_BEARER_TOKEN>`. Request IDs are returned as `x-request-id` and structured in server logs. The application logs slow database transactions once they exceed `SLOW_QUERY_MS`.
