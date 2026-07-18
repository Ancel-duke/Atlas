# Atlas Launch Readiness

**Status:** Public launch readiness checklist  
**Authority:** This document is operational guidance. `ATLAS_GENESIS.md`, `ATLAS_BUILD_SPEC.md`, `docs/00-product-strategy.md`, and `docs/glossary.md` remain the product and technical constitution.  
**Audience:** Founders, engineering, demo operators, launch reviewers, and deployment owners.

Atlas is launch-ready only when it can show, without hidden assumptions, that it understands engineering systems through evidence, confidence, impact, and human-accountable recommendations.

## Architecture

Atlas is organized as a TypeScript monorepo with clear product capabilities:

- `apps/web`: Next.js frontend for onboarding, Repository Pulse, graph exploration, memory, evidence, reasoning, settings, and organization workflows.
- `apps/api`: NestJS API for identity, organizations, repositories, graph, memory, Repository Pulse, Continuous Reasoning, insights, and OpenAPI generation.
- `apps/worker`: asynchronous ingestion and intelligence processing.
- `packages/database`: Prisma schema, migrations, and database client.
- `packages/domain`: shared domain rules and confidence/scoring primitives.
- `packages/contracts`: cross-boundary DTOs and structured schemas.
- `packages/sdk`: typed client surface for Atlas APIs.
- `packages/ui`: shared UI primitives and design-system components.
- `infrastructure`: Docker and deployment support.

Launch architecture principles:

- Repository evidence is ingested before conclusions are presented.
- Atlas Memory Graph is the system of record for relationships, provenance, and temporal engineering context.
- Repository Pulse scores must expose inputs, weights, evidence, gaps, and formula versions.
- Continuous Reasoning must package evidence before agent conclusions are accepted.
- Every material claim must include evidence, confidence, and impact.
- Tenant boundaries must be enforced at API, database access, worker processing, and UI route levels.
- Human accountability remains explicit; Atlas recommends and explains, but does not silently act.

## Production Validation

Required validation before launch:

- Install from a clean checkout with the committed lockfile.
- Generate Prisma client from committed schema and migrations.
- Apply migrations to an empty PostgreSQL database.
- Start PostgreSQL, Redis, API, worker, and web services from Docker.
- Build all packages and applications.
- Generate and verify OpenAPI output.
- Run format, lint, typecheck, unit tests, and build gates.
- Validate authentication with valid, missing, expired, malformed, and cross-tenant JWTs.
- Validate organization creation, repository onboarding, snapshot creation, Repository Pulse, Engineering Memory, Graph Explorer, Evidence Viewer, Engineering Chat, and Insight Feed.
- Validate worker behavior across Redis restart, database restart, worker restart, GitHub timeout, OpenAI timeout, duplicate webhooks, missing repositories, empty repositories, repository rename, and repository deletion.

Last local validation performed:

- `corepack pnpm format:check`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `corepack pnpm build`

Launch owners must repeat the complete validation suite against the exact deployment artifact that will be demonstrated or released.

## Known Issues

- Browser-based visual QA could not be completed in the local agent environment when no browser controller was available. Complete manual or Playwright screenshot verification before launch.
- GitHub OAuth requires real provider credentials and callback URLs configured for the launch environment.
- GitHub webhook validation must be tested with real signed delivery payloads before accepting production traffic.
- External AI behavior depends on configured model, timeout, retry, and rate-limit settings. Launch demos should include timeout and abstention paths.
- Large-repository ingestion should be exercised with realistic repository size, file count, and dependency graph complexity.
- Repository Pulse confidence is only as strong as the evidence currently ingested. Low evidence should result in low confidence or withheld conclusions, not optimistic scores.

## Security Checklist

- Environment secrets are not committed; `.env.example` documents required variables.
- GitHub OAuth credentials are stored in the deployment secret manager.
- Internal API secrets are unique per environment.
- JWT validation rejects invalid issuer, audience, signature, expiry, and malformed tokens.
- Organization access is checked on every tenant-scoped API route.
- Repository IDs are always resolved through organization ownership before data access.
- Worker jobs carry tenant and repository identifiers and re-check authorization-relevant state before mutation.
- GitHub webhooks verify signatures and handle duplicate deliveries idempotently.
- OpenAI and GitHub API failures do not leak secrets in logs or user-facing errors.
- Logs include correlation IDs but never access tokens, refresh tokens, OAuth secrets, or raw private keys.
- CORS, cookies, and auth callback URLs match the production domain.
- Database roles follow least privilege for runtime services.
- Public APIs return problem details without stack traces.
- Prompt-injection defenses treat repository content, documentation, issues, and pull request text as untrusted evidence.
- AI conclusions are accepted only after schema validation and evidence checks.

## Performance Checklist

- Web production build completes successfully.
- API cold start and health checks meet deployment expectations.
- Dashboard, Repository Pulse, Graph Explorer, Evidence Viewer, and Engineering Chat initial loads are measured.
- Expensive score calculations are cached, versioned, or run asynchronously.
- Graph retrieval is bounded by tenant, repository, depth, and result limits.
- Repository ingestion handles large file counts without blocking API requests.
- Worker concurrency is configured for available CPU, memory, Redis, database, GitHub, and OpenAI limits.
- Network failures use bounded retries with backoff.
- Database queries for common screens are inspected for avoidable N+1 patterns.
- Frontend routes avoid blocking the first render on non-critical secondary data.
- Charts and drill-down panels render predictably with empty, small, and large datasets.

## Accessibility Checklist

- All primary routes are keyboard navigable.
- Focus states are visible in light and dark modes.
- Form inputs have labels, descriptions, and actionable validation errors.
- Buttons and links have accessible names.
- Charts include textual score explanations and do not rely on color alone.
- Evidence drawers and dialogs trap focus and restore focus on close.
- Empty states include a clear next action.
- Error states explain what failed and what the user can do next.
- Color contrast is checked for dashboard, Pulse, graph, chat, settings, and onboarding screens.
- Responsive layouts are tested at mobile, tablet, laptop, and wide desktop widths.
- Animations respect reduced-motion preferences.

## Deployment Checklist

- Production environment variables are configured and audited.
- PostgreSQL is provisioned, backed up, and monitored.
- Redis is provisioned with persistence and restart behavior understood.
- Prisma migrations are applied before API and worker rollout.
- API, worker, and web images are built from the same commit.
- OpenAPI output matches the deployed API.
- Health checks exist for web, API, worker dependencies, PostgreSQL, and Redis.
- Structured logs and traces are routed to the launch observability backend.
- Error alerts are configured for API 5xx, worker failures, failed ingestion jobs, webhook verification failures, and AI timeout rates.
- Rollback procedure is documented and tested.
- Seed or demo organization data is separated from production customer data.
- Dockerfiles and infrastructure configuration are committed and reviewed.

## Demo Checklist

The demo should make Atlas feel inevitable: every screen should reinforce that Atlas understands engineering.

- Start with the public page and sign-in flow.
- Create or select an organization.
- Onboard a repository using a stable provider repository identity.
- Show ingestion or snapshot state honestly.
- Open Dashboard and explain the operating view.
- Open Repository Pulse and inspect the visible score formula, evidence, confidence, and gaps.
- Open Graph Explorer and show repository relationships as engineering structure, not search results.
- Open Evidence Viewer and verify that claims trace back to source artifacts.
- Open Engineering Memory and show durable knowledge with history and confidence.
- Open Timeline and show temporal engineering context.
- Open Engineering Chat and ask a question that requires evidence-backed reasoning.
- Show an abstention or low-confidence path so trust is earned rather than implied.
- Show settings and organization membership as tenant and accountability controls.

Demo rules:

- Do not present synthetic or placeholder data as real repository evidence.
- Do not hide loading, failure, or low-confidence states.
- Do not claim Atlas knows something unless the UI shows evidence.
- Prefer one strong evidence-backed insight over many vague claims.

## Hackathon Checklist

- The repository builds from a clean clone.
- The demo script is rehearsed against the exact deployed environment.
- GitHub OAuth credentials and callback URLs are verified.
- OpenAI credentials, model configuration, rate limits, and timeout behavior are verified.
- Docker services start cleanly.
- PostgreSQL and Redis are reachable from API and worker.
- Seed data, if used, is clearly identified as demo data.
- Screenshots or recordings exist as backup for network failure.
- The judge can understand the product promise in the first minute.
- Every major capability has a visible explanation of evidence, confidence, and impact.
- Known limitations are stated plainly.
- The final story connects Atlas Memory Graph, Repository Pulse, Continuous Reasoning, and Engineering Memory into one coherent operating system.

## Future Roadmap

Near-term:

- Complete browser-based visual regression coverage for the full demo path.
- Add larger repository ingestion benchmarks and published limits.
- Expand webhook validation with real GitHub delivery replay tests.
- Add more Repository Pulse factor explanations and historical comparison views.
- Strengthen AI evaluation fixtures with adversarial repository content.

Medium-term:

- Add multi-repository impact analysis across services and ownership boundaries.
- Integrate CI, deployment, incident, and observability evidence sources.
- Add richer correction workflows so humans can amend graph facts and confidence.
- Add organization-wide trend views for architecture drift, ownership gaps, and deployment risk.
- Add role-specific workflows for staff engineers, managers, platform teams, and security reviewers.

Long-term:

- Make Atlas the durable engineering memory layer across repositories, delivery systems, incidents, documentation, and operational telemetry.
- Support accountable recommendations that can create reviewable work items in external systems.
- Provide governance-grade evidence trails for regulated engineering organizations.
- Expand Continuous Reasoning into a measurable, auditable engineering decision pipeline.
