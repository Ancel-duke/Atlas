FROM node:24-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV COREPACK_HOME="/corepack"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /workspace
RUN corepack enable
RUN corepack prepare pnpm@9.15.4 --activate && chmod -R a+rX "$COREPACK_HOME"
RUN apt-get update -y && apt-get install -y --no-install-recommends ca-certificates openssl && rm -rf /var/lib/apt/lists/*

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @atlas/api... build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build --chown=node:node /workspace /workspace
EXPOSE 4000
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD ["node", "-e", "const http=require('node:http');const req=http.get('http://127.0.0.1:4000/health',res=>process.exit(res.statusCode>=200&&res.statusCode<500?0:1));req.on('error',()=>process.exit(1));req.setTimeout(4000,()=>{req.destroy();process.exit(1);});"]
CMD ["sh", "-c", "pnpm --filter @atlas/database prisma:deploy && pnpm --filter @atlas/api start"]
