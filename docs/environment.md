# Environment Configuration

Elegex receives its production configuration through the managed deployment environment. For an external GitHub clone, create these values in your hosting provider’s encrypted secret manager—never commit an `.env` file or placeholder secrets.

| Variable                 | Purpose                                                     | Required           |
| ------------------------ | ----------------------------------------------------------- | ------------------ |
| `DATABASE_URL`           | MySQL/TiDB connection string for Drizzle.                   | Yes                |
| `JWT_SECRET`             | Session-cookie signing secret.                              | Yes                |
| `VITE_APP_ID`            | OAuth application identifier.                               | Yes                |
| `OAUTH_SERVER_URL`       | OAuth service base URL.                                     | Yes                |
| `VITE_OAUTH_PORTAL_URL`  | Browser OAuth portal URL.                                   | Yes                |
| `BUILT_IN_FORGE_API_URL` | Managed storage/integration API base URL.                   | Managed deployment |
| `BUILT_IN_FORGE_API_KEY` | Server-only managed integration credential.                 | Managed deployment |
| `SEED_OPEN_ID`           | Optional owner identifier used by the standalone demo seed. | No                 |

The integration connector model persists safe connection metadata only. It records a `secretReference` for a secret held by the host; it never stores a raw password, token, or API key in the database.
