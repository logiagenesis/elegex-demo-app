FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN npm install -g corepack@latest && corepack enable

FROM base AS dependencies
COPY . .
RUN corepack pnpm install --frozen-lockfile

FROM dependencies AS build
RUN corepack pnpm build

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
COPY --from=dependencies --chown=elegex:elegex /app/node_modules ./node_modules
COPY --from=dependencies --chown=elegex:elegex /app/package.json ./package.json
COPY --from=dependencies --chown=elegex:elegex /app/drizzle ./drizzle
COPY --from=dependencies --chown=elegex:elegex /app/drizzle.config.ts ./drizzle.config.ts
USER elegex
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/index.js"]
