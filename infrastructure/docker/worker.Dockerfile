FROM node:24-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /workspace
RUN corepack enable
RUN apt-get update -y && apt-get install -y --no-install-recommends ca-certificates openssl && rm -rf /var/lib/apt/lists/*

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @atlas/worker... build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build --chown=node:node /workspace /workspace
USER node
CMD ["pnpm", "--filter", "@atlas/worker", "start"]
