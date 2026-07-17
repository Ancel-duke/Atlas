# Atlas Memory Graph Capability Contract

**Owner:** Founding Engineering  
**Version:** 0.1.0  
**Review cadence:** Quarterly

## Responsibilities

Atlas Memory Graph owns typed graph entities, relationships, temporal validity, traversal rules, and
graph projections.

## Data Owned

`graph_entities` and `graph_relationships`.

## Public Interfaces

Capability interfaces will expose typed traversal and projection queries. Foundation persistence
schema is established; product queries are not implemented yet.

## Events Consumed

Repository extraction events, memory correction events, and ADR compliance events.

## Events Published

Graph projection and drift-detection events.

## Invariants

Every node and edge is tenant-scoped, provenance-backed, confidence-scored, and temporally explicit
where validity is known.

## Dependencies

Repository Intelligence, Engineering Memory, PostgreSQL, and pgvector for supplemental retrieval.

## SLAs

Default-branch graph state should update within one hour for eligible events once ingestion exists.
