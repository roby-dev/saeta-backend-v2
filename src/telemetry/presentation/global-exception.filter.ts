import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CorrelationContext } from '../domain/correlation-context.js';
import { PrometheusService } from '../infrastructure/prometheus.service.js';

interface ErrorResponsePayload {
  message?: string | string[];
  error?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly prometheusService: PrometheusService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const traceId = CorrelationContext.getTraceId();
    const timestamp = new Date().toISOString();

    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[] = 'Internal server error';

    if (isHttpException) {
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const errorBody = res as ErrorResponsePayload;
        message = errorBody.message || exception.message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const route = request.route?.path || request.originalUrl || request.url;
    const method = request.method;

    this.prometheusService.recordHttpError(
      method,
      route,
      isHttpException ? exception.constructor.name : 'UnhandledException',
    );

    const logDetails = {
      statusCode,
      method,
      url: request.originalUrl || request.url,
      traceId,
      message,
    };

    if (statusCode >= 500) {
      const stack =
        exception instanceof Error ? exception.stack : JSON.stringify(exception);
      this.logger.error(JSON.stringify(logDetails), stack);
    } else {
      this.logger.warn(JSON.stringify(logDetails));
    }

    response.status(statusCode).json({
      ok: false,
      statusCode,
      message,
      traceId,
      timestamp,
    });
  }
}
