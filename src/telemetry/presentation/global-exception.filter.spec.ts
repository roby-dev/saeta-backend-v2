import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { PrometheusService } from '../infrastructure/prometheus.service.js';
import { GlobalExceptionFilter } from './global-exception.filter.js';

describe('GlobalExceptionFilter', () => {
  const mockPrometheusService = (): PrometheusService => ({
    recordHttpError: vi.fn(),
    recordHttpRequest: vi.fn(),
    getMetrics: vi.fn(),
    getContentType: vi.fn(),
    onModuleInit: vi.fn(),
    httpRequestsTotal: {} as never,
    httpRequestDurationSeconds: {} as never,
    httpErrorsTotal: {} as never,
  });

  const createMockHost = (req: unknown, res: unknown): ArgumentsHost =>
    ({
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    }) as unknown as ArgumentsHost;

  it('handles HttpException properly and returns formatted error json', () => {
    const prometheus = mockPrometheusService();
    const filter = new GlobalExceptionFilter(prometheus);

    const jsonMock = vi.fn();
    const statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    const req = { method: 'GET', url: '/v1/users/non-existent' };
    const res = { status: statusMock };
    const host = createMockHost(req, res);

    const exception = new HttpException('User not found', HttpStatus.NOT_FOUND);

    filter.catch(exception, host);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        statusCode: 404,
        message: 'User not found',
        timestamp: expect.any(String),
      }),
    );
    expect(prometheus.recordHttpError).toHaveBeenCalledWith(
      'GET',
      '/v1/users/non-existent',
      'HttpException',
    );
  });

  it('handles unexpected generic Error with 500 status', () => {
    const prometheus = mockPrometheusService();
    const filter = new GlobalExceptionFilter(prometheus);

    const jsonMock = vi.fn();
    const statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    const req = { method: 'POST', url: '/v1/alerts' };
    const res = { status: statusMock };
    const host = createMockHost(req, res);

    const exception = new Error('Database connection lost');

    filter.catch(exception, host);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        statusCode: 500,
        message: 'Database connection lost',
      }),
    );
  });
});
