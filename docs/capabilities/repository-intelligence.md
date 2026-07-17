# Repository Intelligence Capability Contract

**Owner:** Founding Engineering  
**Version:** 0.1.0  
**Review cadence:** Quarterly

## Responsibilities

Repository Intelligence owns repository connection metadata, source acquisition, immutable
snapshots, deterministic parsing, and extraction jobs.

## Non-Responsibilities

It does not own AI conclusions, Pulse scoring policy, or user-facing health judgments.

## Data Owned

`repositories` and `repository_snapshots`.

## Public Interfaces

No public product API is implemented in the foundation. The worker registers the
`repository.ingestion` queue as the capability-owned asynchronous boundary.

## Events Consumed

`repository.snapshot.requested.v1`, ordered by repository revision when ordering is required.

## Events Published

Future versions publish `repository.snapshot.created.v1` after immutable acquisition succeeds.

## Invariants

Snapshots are immutable. Repository records are tenant-scoped. Jobs are idempotent by repository,
revision, and correlation ID.

## Dependencies

Git provider integrations, PostgreSQL, Redis, and BullMQ.

## SLAs

Webhook receipts target acknowledgement under two seconds. Eligible source events should be
reflected in graph state within one hour after ingestion exists.
