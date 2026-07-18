FROM node:24-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /workspace
RUN corepack enable
RUN apt-get update -y && apt-get install -y --no-install-recommends ca-certificates openssl && rm -rf /var/lib/apt/lists/*

FROM base AS build
ARG ATLAS_INTERNAL_API_SECRET=local-internal-secret-with-at-least-thirty-two-chars
ARG AUTH_GITHUB_ID=replace-with-github-oauth-client-id
ARG AUTH_GITHUB_SECRET=replace-with-github-oauth-client-secret
ARG AUTH_SECRET=local-secret-value-with-at-least-thirty-two-chars
ARG AUTH_URL=http://localhost:3000
ARG NEXT_PUBLIC_ATLAS_API_URL=http://localhost:4000
ENV ATLAS_INTERNAL_API_SECRET=$ATLAS_INTERNAL_API_SECRET
ENV AUTH_GITHUB_ID=$AUTH_GITHUB_ID
ENV AUTH_GITHUB_SECRET=$AUTH_GITHUB_SECRET
ENV AUTH_SECRET=$AUTH_SECRET
ENV AUTH_URL=$AUTH_URL
ENV NEXT_PUBLIC_ATLAS_API_URL=$NEXT_PUBLIC_ATLAS_API_URL
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @atlas/web... build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build --chown=node:node /workspace /workspace
EXPOSE 3000
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD ["node", "-e", "const http=require('node:http');const req=http.get('http://127.0.0.1:3000/',res=>process.exit(res.statusCode>=200&&res.statusCode<500?0:1));req.on('error',()=>process.exit(1));req.setTimeout(4000,()=>{req.destroy();process.exit(1);});"]
CMD ["pnpm", "--filter", "@atlas/web", "start"]
