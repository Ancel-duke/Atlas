# Continuous Reasoning Capability Contract

**Owner:** Founding Engineering  
**Version:** 0.1.0  
**Review cadence:** Quarterly

## Responsibilities

Continuous Reasoning owns evidence-package assembly, AI role orchestration, evaluation gates, prompt
versions, model versions, and insight proposals.

## Data Owned

Prompt, model, evaluation, and reasoning-run records will be added when reasoning is implemented.

## Public Interfaces

No model-provider runtime is implemented in the foundation.

## Events Consumed

Graph changes, repository changes, correction events, and scheduled analysis triggers.

## Events Published

Insight proposal and evaluation result events.

## Invariants

Models are never sources of truth. Persisted AI conclusions require evidence, confidence, impact,
prompt version, model version, and validation.

## Dependencies

Atlas Memory Graph, Engineering Memory, model providers, PostgreSQL.

## SLAs

Reasoning work must stay off the request path unless explicitly designed as an interactive analysis.
