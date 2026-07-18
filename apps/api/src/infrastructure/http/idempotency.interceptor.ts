import { createHash } from "node:crypto";

import type { CallHandler, ExecutionContext, NestInterceptor } from "@nestjs/common";
import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import type { Request, Response } from "express";
import { catchError, from, mergeMap, of, throwError, type Observable } from "rxjs";

import type { Prisma } from "@atlas/database";

import { PrismaService } from "../database/prisma.service.js";
import type { AuthenticatedRequest } from "../../capabilities/identity/presentation/authenticated-request.js";

const writeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  public constructor(private readonly prisma: PrismaService) {}

  public async intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Promise<Observable<unknown>> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request & Partial<AuthenticatedRequest>>();
    const response = http.getResponse<Response>();

    if (!writeMethods.has(request.method) || request.principal === undefined) {
      return next.handle();
    }

    const key = request.header("idempotency-key");
    if (key === undefined || key.trim().length < 8 || key.length > 200) {
      throw new BadRequestException("Write requests require an Idempotency-Key header.");
    }

    const requestHash = hashRequestBody(request.body);
    const existing = await this.claimKey({
      organizationId: request.principal.organizationId,
      key,
      method: request.method,
      path: request.path,
      requestHash
    });

    if (existing !== null) {
      if (existing.requestHash !== requestHash) {
        throw new ConflictException("Idempotency-Key was reused with a different request body.");
      }

      if (existing.status === "completed") {
        if (existing.statusCode !== null) {
          response.status(existing.statusCode);
        }
        return of(existing.responseBody);
      }

      throw new ConflictException("A request with this Idempotency-Key is already in progress.");
    }

    return next.handle().pipe(
      mergeMap((body) =>
        from(
          this.prisma.idempotencyKey.update({
            where: {
              organizationId_key: {
                organizationId: request.principal!.organizationId,
                key
              }
            },
            data: {
              status: "completed",
              statusCode: response.statusCode,
              responseBody: toJson(body),
              completedAt: new Date()
            }
          })
        ).pipe(mergeMap(() => of(body)))
      ),
      catchError((error: unknown) =>
        from(
          this.prisma.idempotencyKey.update({
            where: {
              organizationId_key: {
                organizationId: request.principal!.organizationId,
                key
              }
            },
            data: { status: "failed", completedAt: new Date() }
          })
        ).pipe(mergeMap(() => throwError(() => error)))
      )
    );
  }

  private async claimKey(input: {
    readonly organizationId: string;
    readonly key: string;
    readonly method: string;
    readonly path: string;
    readonly requestHash: string;
  }): Promise<{
    readonly requestHash: string;
    readonly status: string;
    readonly responseBody: Prisma.JsonValue | null;
    readonly statusCode: number | null;
  } | null> {
    try {
      await this.prisma.idempotencyKey.create({
        data: {
          organizationId: input.organizationId,
          key: input.key,
          method: input.method,
          path: input.path,
          requestHash: input.requestHash,
          status: "in_progress"
        }
      });
      return null;
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }

      return this.prisma.idempotencyKey.findUniqueOrThrow({
        where: {
          organizationId_key: {
            organizationId: input.organizationId,
            key: input.key
          }
        },
        select: {
          requestHash: true,
          status: true,
          responseBody: true,
          statusCode: true
        }
      });
    }
  }
}

function hashRequestBody(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (typeof value === "object" && value !== null) {
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`
      )
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { readonly code?: unknown }).code === "P2002"
  );
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
