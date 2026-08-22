# Environment Configuration

Elegex reads configuration at process start. Store every real value in a hosting provider’s encrypted secret manager. The repository does not use a committed `.env` file.

## Core values

| Variable                | Required         | Purpose                                                                             |
| ----------------------- | ---------------- | ----------------------------------------------------------------------------------- |
| `DATABASE_URL`          | Yes              | MySQL or TiDB connection string.                                                    |
| `JWT_SECRET`            | Yes              | Signed session-cookie secret; use a long random value.                              |
| `VITE_APP_ID`           | Yes              | Manus OAuth application ID.                                                         |
| `OAUTH_SERVER_URL`      | Yes              | OAuth server base URL.                                                              |
| `VITE_OAUTH_PORTAL_URL` | Yes              | Browser OAuth portal URL.                                                           |
| `PUBLIC_APP_ORIGIN`     | Production OAuth | Exact HTTPS browser origin accepted for OAuth callbacks.                            |
| `METRICS_BEARER_TOKEN`  | Production       | At least 24 characters; required to read `/metrics` with `Authorization: Bearer …`. |
| `LOG_LEVEL`             | No               | Structured logging threshold; defaults to `info`.                                   |
| `SLOW_QUERY_MS`         | No               | Slow transaction threshold; defaults to `750`.                                      |

## Provider selection

Set `AUTH_PROVIDER`, `STORAGE_PROVIDER`, `NOTIFICATION_PROVIDER`, and `AI_PROVIDER` before supplying credentials for the matching optional provider. The full variable list is in [`config/environment.template`](../config/environment.template).

> **Production safety:** `AUTH_PROVIDER=dev` and `STORAGE_PROVIDER=local` are rejected when `NODE_ENV=production`. Manus and OIDC providers require one canonical `PUBLIC_APP_ORIGIN`, rather than trusting an arbitrary HTTPS callback origin. Anthropic mode is disabled unless both the provider is selected and `ANTHROPIC_API_KEY` is present. Organisation administrators must separately set the persisted AI opt-in before any draft request can run.

Notification webhook and SMTP values are optional. When selected, they require their corresponding secure variables. Do not place provider keys, SMTP passwords, or S3 secrets in integration metadata or source code.

## Local Compose demo

The supplied Compose configuration sets demo authentication, local storage, and no-op external integrations. Its credential-like values exist only inside the disposable local container network; replace all values when adapting the stack to a shared environment.
