FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN npm install -g corepack@latest && corepack enable

FROM base AS dependencies
COPY . .
RUN corepack pnpm install --frozen-lockfile

FROM dependencies AS build
RUN corepack pnpm build

FROM base AS production-dependencies
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN corepack pnpm install --prod --frozen-lockfile

FROM dependencies AS development
RUN groupadd --system --gid 1001 elegex \
  && useradd --system --uid 1001 --gid elegex --create-home elegex \
  && chown -R elegex:elegex /app
USER elegex
ENV NODE_ENV=development
CMD ["corepack", "pnpm", "dev"]

FROM node:22-bookworm-slim AS production
WORKDIR /app
RUN groupadd --system --gid 1001 elegex \
  && useradd --system --uid 1001 --gid elegex --create-home elegex
COPY --from=build --chown=elegex:elegex /app/dist ./dist
COPY --from=production-dependencies --chown=elegex:elegex /app/node_modules ./node_modules
COPY --from=production-dependencies --chown=elegex:elegex /app/package.json ./package.json
USER elegex
ENV NODE_ENV=production
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "dist/index.js"]
