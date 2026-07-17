import { Controller, Get, Headers } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

import type { FoundationStatus, HealthResponse } from "@atlas/contracts";

import { Public } from "../../identity/presentation/public.decorator.js";
import { HealthService } from "../application/health.service.js";

@ApiTags("system")
@Controller()
export class SystemController {
  public constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get("/health")
  @ApiOperation({ summary: "Return API liveness for platform operations." })
  @ApiOkResponse({ description: "API is accepting requests." })
  public getHealth(@Headers("x-correlation-id") correlationId?: string): HealthResponse {
    return this.healthService.getHealth(correlationId ?? crypto.randomUUID());
  }

  @ApiBearerAuth()
  @Get("/v1/system/foundation")
  @ApiOperation({ summary: "Return foundation configuration status for authenticated operators." })
  @ApiOkResponse({ description: "Foundation capabilities and configured dependencies." })
  public getFoundationStatus(): FoundationStatus {
    return this.healthService.getFoundationStatus();
  }
}
