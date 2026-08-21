# Contributing to Elegex

Thank you for improving Elegex. The repository is intentionally structured to make collaboration safe: feature contracts live in tRPC routers, business workflows are tenant-scoped, and infrastructure concerns are isolated in connector modules.

## Development loop

1. Create a focused branch and describe the operational intent in the pull request.
2. Update the Drizzle schema first for any persistence change; generate and review its migration before applying it.
3. Keep organization scoping and authorization server-side. Never trust a client-supplied organization identifier.
4. Run `pnpm verify` locally before opening a pull request.
5. Include tests for role gates, transaction behavior, and failure paths when changing protected workflows.

## Commit guidance

Use concise imperative commits, for example: `feat(outbox): enqueue idempotent webhook events` or `fix(rbac): reject viewer task mutations`.

## Pull requests

Keep pull requests narrow, document data impact, and use the included pull request template. Schema migrations, connector additions, and authorization changes should receive especially careful review.
