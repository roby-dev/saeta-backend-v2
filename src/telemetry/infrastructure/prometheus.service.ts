import { Injectable, OnModuleInit } from '@nestjs/common';
import * as client from 'prom-client';

@Injectable()
export class PrometheusService implements OnModuleInit {
  private readonly registry: client.Registry;

  public readonly httpRequestsTotal: client.Counter<'method' | 'route' | 'status_code'>;
  public readonly httpRequestDurationSeconds: client.Histogram<'method' | 'route' | 'status_code'>;
  public readonly httpErrorsTotal: client.Counter<'method' | 'route' | 'error_type'>;

  constructor() {
    this.registry = new client.Registry();

    this.httpRequestsTotal = new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests processed by SAETA Backend',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpRequestDurationSeconds = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.registry],
    });

    this.httpErrorsTotal = new client.Counter({
      name: 'http_errors_total',
      help: 'Total number of HTTP errors',
      labelNames: ['method', 'route', 'error_type'],
      registers: [this.registry],
    });
  }

  onModuleInit(): void {
    client.collectDefaultMetrics({
      register: this.registry,
      prefix: 'saeta_',
    });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }

  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    durationInSeconds: number,
  ): void {
    const labels = {
      method: method.toUpperCase(),
      route: route || 'unknown',
      status_code: String(statusCode),
    };

    this.httpRequestsTotal.inc(labels);
    this.httpRequestDurationSeconds.observe(labels, durationInSeconds);
  }

  recordHttpError(method: string, route: string, errorType: string): void {
    this.httpErrorsTotal.inc({
      method: method.toUpperCase(),
      route: route || 'unknown',
      error_type: errorType,
    });
  }
}
