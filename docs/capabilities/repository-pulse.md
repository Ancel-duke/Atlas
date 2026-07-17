# Repository Pulse Capability Contract

**Owner:** Founding Engineering  
**Version:** 0.1.0  
**Review cadence:** Quarterly

## Responsibilities

Repository Pulse owns dimension calculations, formula versions, trends, confidence, missing
evidence, and explainability for repository condition assessments.

## Data Owned

`pulse_assessments`.

## Public Interfaces

Future API: `GET /v1/repositories/:repositoryId/pulse`. The web route exists as the canonical UI
location, but no product assessment is fabricated before repository evidence exists.

## Events Consumed

Graph projection changes, insight lifecycle changes, repository snapshot events, and deployment
signal events.

## Events Published

Pulse assessment calculated and stale-assessment events.

## Invariants

Overall health is withheld unless assessment confidence is at least Moderate and at least four
dimensions have sufficient evidence. Scores are never used for individual performance ranking.

## Dependencies

Atlas Memory Graph, Engineering Memory, Repository Intelligence, PostgreSQL.

## SLAs

Affected provisional assessments should update within 15 minutes once event processing exists.
