import { Injectable } from "@nestjs/common";

import { parseServerEnvironment } from "@atlas/config";
import type { FoundationStatus, HealthResponse } from "@atlas/contracts";
import { atlasCapabilities } from "@atlas/domain";

@Injectable()
export class HealthService {
  private readonly environment = parseServerEnvironment(process.env);

  public getHealth(correlationId: string): HealthResponse {
    return {
      status: "ok",
      service: "atlas-api",
      environment: this.environment.ATLAS_ENVIRONMENT,
      timestamp: new Date().toISOString(),
      version: "0.1.0",
      correlationId
    };
  }

  public getFoundationStatus(): FoundationStatus {
    return {
      capabilityBoundaries: [...atlasCapabilities],
      database: { configured: this.environment.DATABASE_URL.length > 0 },
      redis: { configured: this.environment.REDIS_URL.length > 0 },
      openTelemetry: { serviceName: this.environment.OTEL_SERVICE_NAME }
    };
  }
}
