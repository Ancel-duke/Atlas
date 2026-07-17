# 0001 Atlas Foundation Monorepo

**Status:** accepted  
**Owner:** Founding Engineering  
**Date:** 2026-07-17  
**Review date:** 2027-07-17

## Context

Atlas V1 requires a production-ready foundation aligned with `ATLAS_GENESIS.md`,
`docs/00-product-strategy.md`, and `ATLAS_BUILD_SPEC.md`. The system must preserve capability
boundaries while avoiding premature distributed architecture.

## Decision

Atlas uses a pnpm and Turborepo TypeScript monorepo with independently runnable Next.js web,
NestJS API, and NestJS worker applications. Shared code lives in named packages for contracts,
domain, config, database, SDK, UI, and testing. PostgreSQL with pgvector is the authoritative
persistence layer. Redis and BullMQ provide ephemeral job coordination.

## Consequences

This structure keeps V1 deployment simple while making capability ownership explicit. Future
service extraction remains possible because contracts, domain logic, and persistence boundaries are
separated from framework adapters.
