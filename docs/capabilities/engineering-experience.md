# Engineering Experience Capability Contract

**Owner:** Founding Engineering  
**Version:** 0.1.0  
**Review cadence:** Quarterly

## Responsibilities

Engineering Experience owns dashboard routes, Pulse views, graph explorer surfaces, insight feed,
evidence drawer behavior, and bounded conversational UI.

## Data Owned

No source-of-truth product data. UI state is addressable through routes and query parameters.

## Public Interfaces

Next.js application routes, Auth.js route handlers, and the typed SDK.

## Events Consumed

User interactions and server-provided read models.

## Events Published

Authenticated commands through versioned API endpoints when product features are implemented.

## Invariants

The first product route is Repository Pulse. UI must display loading, empty, error, permission, and
stale-data states without inventing unsupported engineering conclusions.

## Dependencies

Atlas API, Auth.js, SDK, and design system package.

## SLAs

Foundation route rendering should complete within normal Next.js production latency budgets.
