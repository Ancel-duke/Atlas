# Engineering Memory Capability Contract

**Owner:** Founding Engineering  
**Version:** 0.1.0  
**Review cadence:** Quarterly

## Responsibilities

Engineering Memory owns facts, decisions, recommendations, evidence, confidence, provenance,
timelines, and corrections.

## Data Owned

`memory_records`, `evidence_items`, and `corrections`.

## Public Interfaces

Correction and evidence APIs are reserved for the first product feature set. Foundation tables and
types are implemented.

## Events Consumed

Graph updates, repository snapshots, ADR lifecycle events, and user correction commands.

## Events Published

`memory.correction.recorded.v1` and memory lifecycle transition events.

## Invariants

Corrections append history and never overwrite evidence. Facts, decisions, and recommendations are
distinct records.

## Dependencies

Atlas Memory Graph, Continuous Reasoning, PostgreSQL.

## SLAs

Corrections must be auditable immediately after acceptance.
