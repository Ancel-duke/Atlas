import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger
} from "@nestjs/common";
import type { Request, Response } from "express";
import { ZodError } from "zod";

import type { ProblemDetails } from "@atlas/contracts";

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  public catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const classification = this.classify(exception);
    const correlationId =
      response.getHeader("x-correlation-id")?.toString() ??
      request.header("x-correlation-id") ??
      crypto.randomUUID();

    this.logException(exception, request, correlationId);

    const problem: ProblemDetails = {
      type: `https://atlas.dev/problems/${classification.type}`,
      title: classification.title,
      status: classification.status,
      detail: classification.detail,
      instance: request.originalUrl,
      correlationId
    };

    response.status(classification.status).json(problem);
  }

  private classify(exception: unknown): {
    readonly type: string;
    readonly title: string;
    readonly status: number;
    readonly detail: string;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return {
        type: String(status),
        title: exception.name,
        status,
        detail: this.httpExceptionDetail(exception)
      };
    }

    if (exception instanceof ZodError) {
      return {
        type: "validation",
        title: "ValidationError",
        status: HttpStatus.BAD_REQUEST,
        detail: exception.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; ")
      };
    }

    if (this.isPrismaKnownRequestError(exception)) {
      const code = exception.code;
      return {
        type: `database/${code}`,
        title: code === "P2022" ? "DatabaseSchemaError" : "DatabaseRequestError",
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        detail: this.prismaDetail(exception)
      };
    }

    return {
      type: "unexpected",
      title: this.errorName(exception),
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: this.errorMessage(exception)
    };
  }

  private httpExceptionDetail(exception: HttpException): string {
    const response = exception.getResponse();
    if (typeof response === "string") {
      return response;
    }
    if (typeof response === "object" && response !== null) {
      const message = (response as { readonly message?: unknown }).message;
      if (typeof message === "string") {
        return message;
      }
      if (Array.isArray(message)) {
        return message.join("; ");
      }
    }
    return exception.message;
  }

  private prismaDetail(exception: {
    readonly code: string;
    readonly message?: unknown;
    readonly meta?: unknown;
  }): string {
    const column =
      typeof exception.meta === "object" &&
      exception.meta !== null &&
      "column" in exception.meta &&
      typeof exception.meta.column === "string"
        ? exception.meta.column
        : undefined;

    if (exception.code === "P2022" && column !== undefined) {
      return `Database schema is missing expected column ${column}. Run Prisma migrations before serving API traffic.`;
    }

    return typeof exception.message === "string" ? exception.message : "Database request failed.";
  }

  private logException(exception: unknown, request: Request, correlationId: string): void {
    const message = `${request.method} ${request.originalUrl} failed correlationId=${correlationId} status=${this.classify(exception).status}`;
    const stack = exception instanceof Error ? exception.stack : undefined;
    this.logger.error(message, stack);
  }

  private isPrismaKnownRequestError(
    exception: unknown
  ): exception is { readonly code: string; readonly message?: unknown; readonly meta?: unknown } {
    return (
      typeof exception === "object" &&
      exception !== null &&
      "code" in exception &&
      typeof exception.code === "string" &&
      exception.code.startsWith("P")
    );
  }

  private errorName(exception: unknown): string {
    return exception instanceof Error && exception.name.length > 0
      ? exception.name
      : "UnexpectedError";
  }

  private errorMessage(exception: unknown): string {
    return exception instanceof Error && exception.message.length > 0
      ? exception.message
      : "An unexpected server error occurred.";
  }
}
