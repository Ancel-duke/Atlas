# Atlas

Atlas is the AI Engineering Operating System. This repository contains the production foundation for
the Atlas monorepo: web application, API, worker, shared packages, database schema, Docker runtime,
CI, and local development tooling.

## Prerequisites

- Node.js 24 or newer
- Corepack enabled for pnpm 9.15.4
- Docker Desktop or a Docker-compatible runtime

## Local Setup

Create a GitHub OAuth app for local development before starting the web app:

- Homepage URL: `http://localhost:3000`
- Authorization callback URL: `http://localhost:3000/api/auth/callback/github`

Copy `.env.example` to `.env` and set `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`,
`AUTH_SECRET`, `ATLAS_JWT_SECRET`, and `ATLAS_INTERNAL_API_SECRET` to real local values. The
internal secret must match between the web app and API because Auth.js exchanges the verified GitHub
profile for an Atlas organization-scoped JWT through the API.

```bash
corepack enable
corepack prepare pnpm@9.15.4 --activate
cp .env.example .env
pnpm install
pnpm db:generate
docker compose up -d postgres redis
pnpm db:migrate
pnpm dev
```

Web runs at `http://localhost:3000`. API runs at `http://localhost:4000`. OpenAPI documentation is
available at `http://localhost:4000/v1/docs` when the API is running.

Authentication is GitHub OAuth through Auth.js. Atlas persists users, external GitHub accounts,
organizations, memberships, invitations, and organization-scoped audit events in PostgreSQL.
Organization switching issues a new Atlas JWT with the selected organization, role, and permission
set.

## Verification

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm openapi:generate
docker compose up --build
```

## Workspace

```text
apps/web      Next.js App Router application
apps/api      NestJS REST API with JWT validation and OpenAPI
apps/worker   NestJS worker application context with BullMQ
packages/*    Shared contracts, domain, config, database, SDK, UI, and testing packages
```

The implementation intentionally avoids Atlas business features. Repository onboarding, AMG
projection, Pulse calculation, insights, and reasoning workflows begin from this foundation.
