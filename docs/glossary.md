# Atlas Glossary

This glossary defines canonical Atlas vocabulary. Product, engineering, documentation, API contracts, UI copy, and AI outputs must use these terms consistently.

| Term | Definition |
|---|---|
| **Atlas** | The AI Engineering Operating System: a platform that maintains engineering understanding and delivers evidence-backed guidance at the point of change. |
| **Atlas Memory Graph (AMG)** | Atlas’s canonical, versioned model of engineering reality. It connects repositories, code, services, dependencies, decisions, ownership, delivery, operations, and their temporal relationships. AMG is the sole canonical name; do not use “LEKG” or “Engineering Knowledge Graph” as substitutes. |
| **Repository Intelligence** | The capability that acquires repository evidence and deterministically extracts metadata, symbols, dependencies, tests, documentation, infrastructure, and source snapshots. |
| **Engineering Memory** | The capability and model that retain facts, decisions, evidence, confidence, ownership, reasoning, timelines, and corrections as durable, versioned knowledge. |
| **Memory Record** | A versioned engineering-memory object representing a fact, decision, or recommendation, with provenance, lifecycle, and relationships. |
| **Evidence** | An immutable, traceable artifact that supports or challenges a claim: for example a commit, source location, ADR, deployment, test result, or incident. |
| **Provenance** | Metadata describing where a fact, relationship, or conclusion came from, when it was acquired, how it was derived, and which source revision supports it. |
| **Confidence** | Atlas’s calibrated assessment that a claim or assessment is correct, expressed as score or band with factors, missing evidence, and counterevidence. It is distinct from impact. |
| **Impact** | The expected consequence if a claim is true and unaddressed, classified as low, medium, high, or critical. It is distinct from confidence. |
| **Insight** | An actionable, evidence-backed engineering conclusion with claim, scope, evidence, confidence, impact, status, and recommended next action. |
| **Correction** | A human or system amendment to a graph or memory claim. Corrections are append-only events that preserve the prior claim and its history. |
| **Continuous Reasoning** | The capability that assembles bounded AMG evidence and uses specialized AI agents to produce grounded analysis, plans, and insight proposals. |
| **Repository Pulse** | Atlas’s explainable engineering-condition assessment for a repository, service, bounded context, or organization. It exposes dimensions, confidence, evidence, trends, and formula version. |
| **Pulse Assessment** | A versioned calculation of Repository Pulse, including dimension values, formula version, contributing evidence, confidence, freshness, and trend context. |
| **Capability** | A stable product and architectural boundary that owns a defined outcome, data, interfaces, events, invariants, dependencies, and service-level expectations. |
| **Graph Entity** | A stable object represented in AMG, such as a repository, service, API, database, ADR, deployment, or incident. |
| **Graph Relationship** | A typed, versioned link between two graph entities, backed by provenance, confidence, validity interval, and lifecycle status. |
| **Architecture Decision Record (ADR)** | The governed record of a material architecture decision, its context, alternatives, owner, consequences, review date, and compliance evidence. |
| **Observed fact** | A claim directly supported by deterministic extraction or a source of record. |
| **Inference** | A claim derived from evidence and reasoning, explicitly marked with confidence and assumptions. |
| **Recommendation** | A proposed next action based on facts and inferences. It is never presented as an observed fact. |
