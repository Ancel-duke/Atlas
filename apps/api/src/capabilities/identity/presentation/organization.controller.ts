import { Body, Controller, Get, Headers, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

import {
  acceptInvitationRequestSchema,
  authTokenResponseSchema,
  createInvitationRequestSchema,
  createInvitationResponseSchema,
  createOrganizationRequestSchema,
  invitationSchema,
  membershipSchema,
  organizationSummarySchema,
  switchOrganizationRequestSchema,
  updateMembershipRequestSchema,
  uuidSchema,
  type AuthTokenResponse,
  type CreateInvitationResponse,
  type Invitation,
  type Membership,
  type OrganizationSummary
} from "@atlas/contracts";

import { parseRequest } from "../../../infrastructure/http/parse-request.js";
import { OrganizationService } from "../application/organization.service.js";
import type { AuthenticatedPrincipal } from "../application/jwt-verifier.js";
import { CurrentPrincipal } from "./current-principal.decorator.js";
import { RequirePermission } from "./require-permission.decorator.js";

@ApiTags("organizations")
@ApiBearerAuth()
@Controller("/v1")
export class OrganizationController {
  public constructor(private readonly organizationService: OrganizationService) {}

  @Get("/organizations")
  @RequirePermission("organization:read")
  @ApiOperation({ summary: "List organizations available to the authenticated user." })
  @ApiOkResponse({ description: "Organization memberships for the current user." })
  public async listOrganizations(
    @CurrentPrincipal() principal: AuthenticatedPrincipal
  ): Promise<OrganizationSummary[]> {
    const organizations = await this.organizationService.listOrganizations(principal);
    return parseRequest(organizationSummarySchema.array(), organizations);
  }

  @Get("/organizations/current")
  @RequirePermission("organization:read")
  @ApiOperation({ summary: "Return the current organization selected by the JWT." })
  public async getCurrentOrganization(
    @CurrentPrincipal() principal: AuthenticatedPrincipal
  ): Promise<OrganizationSummary> {
    return parseRequest(
      organizationSummarySchema,
      await this.organizationService.getCurrentOrganization(principal)
    );
  }

  @Post("/organizations")
  @RequirePermission("organization:create")
  @ApiOperation({ summary: "Create a new organization and switch into it." })
  public async createOrganization(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() body: unknown,
    @Headers("x-correlation-id") correlationId?: string
  ): Promise<AuthTokenResponse> {
    const response = await this.organizationService.createOrganization(
      principal,
      parseRequest(createOrganizationRequestSchema, body),
      correlationId ?? crypto.randomUUID()
    );
    return parseRequest(authTokenResponseSchema, response);
  }

  @Post("/organizations/switch")
  @RequirePermission("organization:read")
  @ApiOperation({ summary: "Switch the current organization and issue a new Atlas JWT." })
  public async switchOrganization(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() body: unknown,
    @Headers("x-correlation-id") correlationId?: string
  ): Promise<AuthTokenResponse> {
    const request = parseRequest(switchOrganizationRequestSchema, body);
    const response = await this.organizationService.switchOrganization(
      principal.userId,
      request.organizationId,
      principal,
      correlationId ?? crypto.randomUUID()
    );
    return parseRequest(authTokenResponseSchema, response);
  }

  @Get("/organizations/:organizationId/memberships")
  @RequirePermission("membership:read")
  @ApiOperation({ summary: "List memberships for the current organization." })
  public async listMemberships(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("organizationId") organizationIdParam: string
  ): Promise<Membership[]> {
    const organizationId = parseRequest(uuidSchema, organizationIdParam);
    const memberships = await this.organizationService.listMemberships(principal, organizationId);
    return parseRequest(membershipSchema.array(), memberships);
  }

  @Patch("/organizations/:organizationId/memberships/:membershipId")
  @RequirePermission("membership:update")
  @ApiOperation({ summary: "Update a membership role or status." })
  public async updateMembership(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("organizationId") organizationIdParam: string,
    @Param("membershipId") membershipIdParam: string,
    @Body() body: unknown,
    @Headers("x-correlation-id") correlationId?: string
  ): Promise<Membership> {
    const membership = await this.organizationService.updateMembership(
      principal,
      parseRequest(uuidSchema, organizationIdParam),
      parseRequest(uuidSchema, membershipIdParam),
      parseRequest(updateMembershipRequestSchema, body),
      correlationId ?? crypto.randomUUID()
    );
    return parseRequest(membershipSchema, membership);
  }

  @Get("/organizations/:organizationId/invitations")
  @RequirePermission("invitation:read")
  @ApiOperation({ summary: "List invitations for the current organization." })
  public async listInvitations(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("organizationId") organizationIdParam: string
  ): Promise<Invitation[]> {
    const invitations = await this.organizationService.listInvitations(
      principal,
      parseRequest(uuidSchema, organizationIdParam)
    );
    return parseRequest(invitationSchema.array(), invitations);
  }

  @Post("/organizations/:organizationId/invitations")
  @RequirePermission("invitation:create")
  @ApiOperation({ summary: "Create an invitation for the current organization." })
  public async createInvitation(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("organizationId") organizationIdParam: string,
    @Body() body: unknown,
    @Headers("x-correlation-id") correlationId?: string
  ): Promise<CreateInvitationResponse> {
    const response = await this.organizationService.createInvitation(
      principal,
      parseRequest(uuidSchema, organizationIdParam),
      parseRequest(createInvitationRequestSchema, body),
      correlationId ?? crypto.randomUUID()
    );
    return parseRequest(createInvitationResponseSchema, response);
  }

  @Post("/invitations/accept")
  @RequirePermission("organization:read")
  @ApiOperation({ summary: "Accept an invitation and switch into the invited organization." })
  public async acceptInvitation(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() body: unknown,
    @Headers("x-correlation-id") correlationId?: string
  ): Promise<AuthTokenResponse> {
    const response = await this.organizationService.acceptInvitation(
      principal,
      parseRequest(acceptInvitationRequestSchema, body),
      correlationId ?? crypto.randomUUID()
    );
    return parseRequest(authTokenResponseSchema, response);
  }
}
