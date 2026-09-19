import { Injectable, type LoggerService } from '@nestjs/common';
import { CorrelationContext } from '../domain/correlation-context.js';

export interface LogPayload {
  timestamp: string;
  level: string;
  context?: string;
  traceId?: string;
  message: string;
  stack?: string;
  meta?: Record<string, unknown>;
}

@Injectable()
export class StructuredLoggerService implements LoggerService {
  private readonly isProduction = process.env.NODE_ENV === 'production';

  log(message: unknown, context?: string): void {
    this.print('INFO', message, context);
  }

  error(message: unknown, stack?: string, context?: string): void {
    this.print('ERROR', message, context, stack);
  }

  warn(message: unknown, context?: string): void {
    this.print('WARN', message, context);
  }

  debug?(message: unknown, context?: string): void {
    this.print('DEBUG', message, context);
  }

  verbose?(message: unknown, context?: string): void {
    this.print('VERBOSE', message, context);
  }

  private print(
    level: string,
    message: unknown,
    context?: string,
    stack?: string,
  ): void {
    const traceId = CorrelationContext.getTraceId();
    const timestamp = new Date().toISOString();
    const formattedMessage =
      typeof message === 'string'
        ? message
        : typeof message === 'number' || typeof message === 'boolean'
          ? message.toString()
          : JSON.stringify(message);

    const logEntry: LogPayload = {
      timestamp,
      level,
      context: context ?? 'Application',
      traceId,
      message: formattedMessage,
      stack,
    };

    if (this.isProduction || process.env.LOG_FORMAT === 'json') {
      // Single-line NDJSON format optimized for Loki / Promtail
      process.stdout.write(`${JSON.stringify(logEntry)}\n`);
    } else {
      // Readable development output with timestamp and traceId
      const traceBadge = traceId ? ` [trace:${traceId.slice(0, 8)}]` : '';
      const contextBadge = context ? ` [${context}]` : '';
      const line = `[${timestamp}] ${level}${contextBadge}${traceBadge} ${formattedMessage}`;

      if (level === 'ERROR') {
        process.stderr.write(`${line}\n`);
        if (stack) {
          process.stderr.write(`${stack}\n`);
        }
      } else {
        process.stdout.write(`${line}\n`);
      }
    }
  }
}
