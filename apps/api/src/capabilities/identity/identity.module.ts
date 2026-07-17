import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../infrastructure/database/database.module.js";
import { AuditLogService } from "./application/audit-log.service.js";
import { IdentityService } from "./application/identity.service.js";
import { JwtVerifier } from "./application/jwt-verifier.js";
import { OrganizationService } from "./application/organization.service.js";
import { IdentityController } from "./presentation/identity.controller.js";
import { OrganizationController } from "./presentation/organization.controller.js";

@Module({
  imports: [DatabaseModule],
  controllers: [IdentityController, OrganizationController],
  providers: [AuditLogService, IdentityService, JwtVerifier, OrganizationService],
  exports: [JwtVerifier, IdentityService, OrganizationService]
})
export class IdentityModule {}
