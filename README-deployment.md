# Elegex Deployment Guide

This guide covers how to deploy the Elegex application using Docker.

## Prerequisites

- Docker and Docker Compose
- A MySQL/MariaDB database (if not using the bundled compose database)
- An OAuth provider (Manus OAuth or compatible)

## Local Development & Testing

To spin up the entire stack locally:

```bash
docker-compose up --build
```

This will start MariaDB and the Elegex application on port 3000. Note that the application will start, but you will need valid OAuth credentials to log in.

## Production Deployment

For production, you should use a managed database and inject secrets securely.

1. Build the image:
   ```bash
   docker build -t elegex-app .
   ```
2. Run the container with required environment variables:
   ```bash
   docker run -p 3000:3000 \
     -e NODE_ENV=production \
     -e DATABASE_URL="mysql://user:pass@host:3306/db" \
     -e JWT_SECRET="your-secure-secret" \
     -e OAUTH_SERVER_URL="https://your-oauth-server.com" \
     -e VITE_OAUTH_PORTAL_URL="https://your-oauth-portal.com" \
     -e VITE_APP_ID="your-app-id" \
     elegex-app
   ```

## Database Migrations

Migrations are handled via Drizzle. Run them against your production database before starting the app:

```bash
pnpm run db:push
```
