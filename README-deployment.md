# Elegex Deployment Guide

Elegex can run locally with the included Compose stack or as a non-root Node 22 container backed by a MySQL-compatible database. See [`docs/deployment.md`](docs/deployment.md) for the complete operating guide and [`docs/environment.md`](docs/environment.md) for the non-secret configuration reference.

## Local zero-account demonstration

```bash
docker compose up --build
```

The local stack starts MariaDB, runs the committed Drizzle migrations through a dedicated `migrate` service, and starts the application with `AUTH_PROVIDER=demo`, local storage, and no-op external integrations. Open `http://localhost:3000`, select a demo persona, and explore the role-scoped synthetic workspace. No OAuth, S3, SMTP, notification, or AI account is required.

## Production container

Build the default production stage and inject all configuration through an encrypted secret manager.

```bash
docker build -t elegex-app .
docker run --rm -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL='mysql://user:password@db:3306/elegex' \
  -e JWT_SECRET='<long-random-session-secret>' \
  -e VITE_APP_ID='<oauth-app-id>' \
  -e OAUTH_SERVER_URL='https://api.manus.im' \
  -e VITE_OAUTH_PORTAL_URL='https://manus.im' \
  -e PUBLIC_APP_ORIGIN='https://app.example.com' \
  -e METRICS_BEARER_TOKEN='<long-random-metrics-token>' \
  elegex-app
```

The production runtime refuses a development authentication provider, local file storage, an arbitrary OAuth callback origin, and an unprotected metrics endpoint. Probe `GET /health` or `GET /healthz` for liveness and `GET /ready` or `GET /readyz` for database readiness. Supply `Authorization: Bearer <METRICS_BEARER_TOKEN>` when scraping `/metrics`.

## Database migrations

The Compose `migrate` service executes `pnpm db:migrate`; it does **not** run schema push. For every persistent environment, generate and inspect an additive migration, apply it to the target database, and then deploy its matching application revision.

```bash
pnpm db:generate
# inspect drizzle/<new-migration>.sql
pnpm db:migrate
pnpm verify
```

Never use `drizzle-kit push` as a substitute for reviewed migrations on a persistent environment.
