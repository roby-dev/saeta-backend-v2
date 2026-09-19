import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrometheusService } from '../infrastructure/prometheus.service.js';

interface RouteHolder {
  path?: string;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  constructor(private readonly prometheusService: PrometheusService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const start = performance.now();
    const method = req.method;
    const url = req.originalUrl || req.url;

    return next.handle().pipe(
      tap({
        next: () => {
          const durationInMs = Math.round(performance.now() - start);
          const durationInSec = durationInMs / 1000;
          const statusCode = res.statusCode || 200;
          const routeHolder = req.route as RouteHolder | undefined;
          const route = routeHolder?.path || url.split('?')[0];

          this.prometheusService.recordHttpRequest(
            method,
            route,
            statusCode,
            durationInSec,
          );

          this.logger.log(
            `${method} ${url} ${statusCode} - ${durationInMs}ms`,
            'HTTP',
          );
        },
        error: (err: { status?: number; statusCode?: number }) => {
          const durationInMs = Math.round(performance.now() - start);
          const durationInSec = durationInMs / 1000;
          const statusCode = err.status || err.statusCode || 500;
          const routeHolder = req.route as RouteHolder | undefined;
          const route = routeHolder?.path || url.split('?')[0];

          this.prometheusService.recordHttpRequest(
            method,
            route,
            statusCode,
            durationInSec,
          );
        },
      }),
    );
  }
}
