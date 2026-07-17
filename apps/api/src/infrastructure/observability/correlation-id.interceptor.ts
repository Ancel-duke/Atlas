import type { CallHandler, ExecutionContext, NestInterceptor } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import type { Request, Response } from "express";
import type { Observable } from "rxjs";

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const incomingCorrelationId = request.header("x-correlation-id");
    const correlationId = incomingCorrelationId ?? crypto.randomUUID();

    response.setHeader("x-correlation-id", correlationId);
    return next.handle();
  }
}
