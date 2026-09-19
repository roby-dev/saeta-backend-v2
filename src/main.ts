import dns from 'node:dns';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { GlobalExceptionFilter } from './telemetry/presentation/global-exception.filter.js';
import { LoggingInterceptor } from './telemetry/presentation/logging.interceptor.js';
import { StructuredLoggerService } from './telemetry/infrastructure/structured-logger.service.js';

dns.setServers(['8.8.8.8', '1.1.1.1']);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.enableCors({
    origin: config.getOrThrow<string>('CORS_ORIGIN').split(','),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const logger = app.get(StructuredLoggerService);
  app.useLogger(logger);
  app.useGlobalFilters(app.get(GlobalExceptionFilter));
  app.useGlobalInterceptors(app.get(LoggingInterceptor));

  await app.listen(config.getOrThrow<number>('PORT'));
}
await bootstrap();
