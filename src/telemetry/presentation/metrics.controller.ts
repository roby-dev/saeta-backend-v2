import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PrometheusService } from '../infrastructure/prometheus.service.js';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly prometheusService: PrometheusService) {}

  @Get()
  async getMetrics(@Res() res: Response): Promise<void> {
    const metrics = await this.prometheusService.getMetrics();
    res.setHeader('Content-Type', this.prometheusService.getContentType());
    res.send(metrics);
  }
}
