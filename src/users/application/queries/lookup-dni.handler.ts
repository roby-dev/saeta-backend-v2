import { BadRequestException, NotFoundException } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../../../config/environment.validation.js';
import { LookupDniQuery } from './lookup-dni.query.js';

interface ReniecResponse {
  dni?: string;
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  codVerifica?: string;
}

export interface LookupDniResult {
  ok: boolean;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
}

@QueryHandler(LookupDniQuery)
export class LookupDniHandler implements IQueryHandler<LookupDniQuery, LookupDniResult> {
  constructor(private readonly config: ConfigService<Environment, true>) {}

  async execute(query: LookupDniQuery): Promise<LookupDniResult> {
    if (!/^\d{8}$/.test(query.dni)) {
      throw new BadRequestException('DNI must be exactly 8 digits');
    }

    const token = this.config.get('RENIEC_TOKEN', { infer: true });
    if (!token) {
      throw new BadRequestException('RENIEC_TOKEN is not configured');
    }
    const url = `https://dniruc.apisperu.com/api/v1/dni/${query.dni}?token=${token}`;

    let data: ReniecResponse;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new NotFoundException('DNI not found in RENIEC');
      }
      data = (await response.json()) as ReniecResponse;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new BadRequestException('RENIEC service unavailable');
    }

    if (!data.nombres && !data.apellidoPaterno) {
      throw new NotFoundException('DNI not found in RENIEC');
    }

    return {
      ok: true,
      nombres: data.nombres ?? '',
      apellidoPaterno: data.apellidoPaterno ?? '',
      apellidoMaterno: data.apellidoMaterno ?? '',
    };
  }
}
