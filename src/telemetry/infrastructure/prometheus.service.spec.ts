import { describe, expect, it } from 'vitest';
import { PrometheusService } from './prometheus.service.js';

describe('PrometheusService', () => {
  it('initializes registry and records http request metrics', async () => {
    const service = new PrometheusService();
    service.onModuleInit();

    service.recordHttpRequest('GET', '/v1/users', 200, 0.045);
    service.recordHttpError('POST', '/v1/alerts', 'BadRequestException');

    const metrics = await service.getMetrics();
    expect(metrics).toContain('http_requests_total');
    expect(metrics).toContain('http_request_duration_seconds');
    expect(metrics).toContain('http_errors_total');
    expect(metrics).toContain('status_code="200"');
    expect(service.getContentType()).toBeDefined();
  });
});
