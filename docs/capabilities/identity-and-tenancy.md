# Identity and Tenancy Capability Contract

Identity and Tenancy is the Atlas control-plane capability responsible for authentication,
organization boundaries, membership authorization, invitations, organization switching, JWT
issuance, and tenant-scoped audit logging.

## Responsibilities

- Authenticate users through GitHub OAuth using Auth.js.
- Persist Atlas users and external GitHub account links.
- Create and manage organizations.
- Enforce organization-scoped memberships, roles, and permissions.
- Issue Atlas JWTs scoped to one active organization.
- Support organization switching through explicit token re-issuance.
- Manage invitations and invitation acceptance.
- Record audit events for identity and tenancy mutations.

## Owned Data

- `users`
- `external_accounts`
- `organizations`
- `memberships`
- `invitations`
- `audit_events` for identity and tenancy events

## Public Interfaces

- `POST /v1/identity/oauth/github`
- `GET /v1/identity/session`
- `GET /v1/organizations`
- `GET /v1/organizations/current`
- `POST /v1/organizations`
- `POST /v1/organizations/switch`
- `GET /v1/organizations/:organizationId/memberships`
- `PATCH /v1/organizations/:organizationId/memberships/:membershipId`
- `GET /v1/organizations/:organizationId/invitations`
- `POST /v1/organizations/:organizationId/invitations`
- `POST /v1/invitations/accept`

## Events Consumed

- Auth.js GitHub OAuth callback profile.
- Organization switch request.
- Invitation acceptance request.

## Events Published

Current implementation records durable audit events. Domain outbox events will be added when
cross-capability workflows need asynchronous reactions.

- `identity.github_oauth_first_organization_created`
- `identity.github_oauth_exchanged`
- `organization.created`
- `organization.switched`
- `membership.updated`
- `invitation.created`
- `invitation.accepted`

## Invariants

- API authorization is based on an Atlas JWT, not a GitHub token.
- Every Atlas JWT is scoped to exactly one organization.
- Cross-organization route access is forbidden even if the user belongs to both organizations.
- A user must have an active membership before receiving an organization-scoped JWT.
- Owners cannot demote or disable their own owner membership.
- Invitation acceptance requires the authenticated email to match the invitation email.
- Audit events created by this capability always include `organization_id`.

## Dependencies

- Auth.js for OAuth session handling in the web application.
- GitHub OAuth and GitHub email API for identity proof.
- PostgreSQL through Prisma for persistence.
- `@atlas/contracts` for request and response validation.
- `@atlas/domain` for deterministic role and permission rules.

## SLAs

- Session validation should complete within 50 ms excluding network variance.
- Organization listing should complete within 150 ms for users with up to 100 memberships.
- Organization switch should complete within 250 ms excluding database contention.
- Invitation creation should complete within 250 ms excluding database contention.

## Observability

- All REST responses include correlation IDs through the API interceptor.
- All tenancy mutations emit audit events with actor, organization, target, event name, metadata,
  and correlation ID.
- Authentication failures use explicit `401` responses.
- Cross-organization authorization failures use explicit `403` responses.
