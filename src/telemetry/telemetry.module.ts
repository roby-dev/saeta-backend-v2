import {
  Global,
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';
import { PrometheusService } from './infrastructure/prometheus.service.js';
import { StructuredLoggerService } from './infrastructure/structured-logger.service.js';
import { CorrelationMiddleware } from './presentation/correlation.middleware.js';
import { GlobalExceptionFilter } from './presentation/global-exception.filter.js';
import { LoggingInterceptor } from './presentation/logging.interceptor.js';
import { MetricsController } from './presentation/metrics.controller.js';

@Global()
@Module({
  controllers: [MetricsController],
  providers: [
    StructuredLoggerService,
    PrometheusService,
    LoggingInterceptor,
    GlobalExceptionFilter,
  ],
  exports: [
    StructuredLoggerService,
    PrometheusService,
    LoggingInterceptor,
    GlobalExceptionFilter,
  ],
})
export class TelemetryModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationMiddleware).forRoutes('*');
  }
}
