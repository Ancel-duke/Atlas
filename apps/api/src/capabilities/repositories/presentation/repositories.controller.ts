import { Body, Controller, Get, Headers, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import {
  createRepositoryRequestSchema,
  repositorySchema,
  updateRepositoryRequestSchema,
  uuidSchema,
  type Repository
} from "@atlas/contracts";

import { parseRequest } from "../../../infrastructure/http/parse-request.js";
import type { AuthenticatedPrincipal } from "../../identity/application/jwt-verifier.js";
import { CurrentPrincipal } from "../../identity/presentation/current-principal.decorator.js";
import { RequirePermission } from "../../identity/presentation/require-permission.decorator.js";
import { RepositoriesService } from "../application/repositories.service.js";

@ApiTags("repositories")
@ApiBearerAuth()
@Controller("/v1/repositories")
export class RepositoriesController {
  public constructor(private readonly repositoriesService: RepositoriesService) {}

  @Get()
  @RequirePermission("repository:read")
  @ApiOperation({ summary: "List repositories in the current organization." })
  public async list(@CurrentPrincipal() principal: AuthenticatedPrincipal): Promise<Repository[]> {
    return parseRequest(repositorySchema.array(), await this.repositoriesService.list(principal));
  }

  @Post()
  @RequirePermission("repository:write")
  @ApiOperation({ summary: "Connect or update a repository record." })
  public async create(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() body: unknown,
    @Headers("x-correlation-id") correlationId?: string
  ): Promise<Repository> {
    return parseRequest(
      repositorySchema,
      await this.repositoriesService.create(
        principal,
        parseRequest(createRepositoryRequestSchema, body),
        correlationId ?? crypto.randomUUID()
      )
    );
  }

  @Get("/:repositoryId")
  @RequirePermission("repository:read")
  @ApiOperation({ summary: "Get a repository." })
  public async get(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("repositoryId") repositoryId: string
  ): Promise<Repository> {
    return parseRequest(
      repositorySchema,
      await this.repositoriesService.get(principal, parseRequest(uuidSchema, repositoryId))
    );
  }

  @Patch("/:repositoryId")
  @RequirePermission("repository:write")
  @ApiOperation({ summary: "Update repository settings." })
  public async update(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("repositoryId") repositoryId: string,
    @Body() body: unknown,
    @Headers("x-correlation-id") correlationId?: string
  ): Promise<Repository> {
    return parseRequest(
      repositorySchema,
      await this.repositoriesService.update(
        principal,
        parseRequest(uuidSchema, repositoryId),
        parseRequest(updateRepositoryRequestSchema, body),
        correlationId ?? crypto.randomUUID()
      )
    );
  }
}
