import type { CallHandler, ExecutionContext, NestInterceptor } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import type { Request, Response } from "express";
import { from, mergeMap, of, type Observable } from "rxjs";

import type { Prisma } from "@atlas/database";

import type { AuthenticatedRequest } from "../../capabilities/identity/presentation/authenticated-request.js";
import { PrismaService } from "../database/prisma.service.js";

const writeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

@Injectable()
export class WriteAuditInterceptor implements NestInterceptor {
  public constructor(private readonly prisma: PrismaService) {}

  public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request & Partial<AuthenticatedRequest>>();
    const response = http.getResponse<Response>();

    if (!writeMethods.has(request.method) || request.principal === undefined) {
      return next.handle();
    }

    return next.handle().pipe(
      mergeMap((body) =>
        from(
          this.prisma.auditEvent.create({
            data: {
              organizationId: request.principal!.organizationId,
              actorId: request.principal!.userId,
              eventName: `http.${request.method.toLowerCase()}`,
              targetType: "http_request",
              targetId: null,
              correlationId:
                response.getHeader("x-correlation-id")?.toString() ??
                request.header("x-correlation-id") ??
                crypto.randomUUID(),
              metadata: toJson({
                path: request.path,
                statusCode: response.statusCode
              })
            }
          })
        ).pipe(mergeMap(() => of(body)))
      )
    );
  }
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
