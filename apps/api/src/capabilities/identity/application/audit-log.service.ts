import { Injectable } from "@nestjs/common";

import type { Prisma } from "@atlas/database";

import { PrismaService } from "../../../infrastructure/database/prisma.service.js";

export type AuditLogInput = {
  readonly organizationId: string;
  readonly actorId: string | null;
  readonly eventName: string;
  readonly targetType: string;
  readonly targetId: string | null;
  readonly correlationId: string;
  readonly metadata: Prisma.InputJsonObject;
};

@Injectable()
export class AuditLogService {
  public constructor(private readonly prisma: PrismaService) {}

  public async record(input: AuditLogInput): Promise<void> {
    await this.prisma.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorId: input.actorId,
        eventName: input.eventName,
        targetType: input.targetType,
        targetId: input.targetId,
        correlationId: input.correlationId,
        metadata: input.metadata
      }
    });
  }
}
