import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import type { Request, Response } from "express";

import type { ProblemDetails } from "@atlas/contracts";

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  public catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const title = exception instanceof HttpException ? exception.name : "InternalServerError";
    const correlationId =
      response.getHeader("x-correlation-id")?.toString() ??
      request.header("x-correlation-id") ??
      crypto.randomUUID();

    const problem: ProblemDetails = {
      type: `https://atlas.dev/problems/${status}`,
      title,
      status,
      detail: this.detail(exception, status),
      instance: request.originalUrl,
      correlationId
    };

    response.status(status).json(problem);
  }

  private detail(exception: unknown, status: number): string {
    if (exception instanceof HttpException) {
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

    return status === 500 ? "An unexpected server error occurred." : "The request failed.";
  }
}
