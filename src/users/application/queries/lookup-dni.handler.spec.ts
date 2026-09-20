import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Environment } from '../../../config/environment.validation.js';
import type { UserRepository } from '../../domain/user.repository.js';
import { LookupDniHandler } from './lookup-dni.handler.js';
import { LookupDniQuery } from './lookup-dni.query.js';

describe('LookupDniHandler', () => {
  let handler: LookupDniHandler;
  let mockConfig: Partial<ConfigService<Environment, true>>;
  let mockUsers: Partial<UserRepository>;

  beforeEach(() => {
    mockConfig = {
      get: vi.fn().mockReturnValue('mock-reniec-token'),
    };
    mockUsers = {
      findByDni: vi.fn().mockResolvedValue(null),
    };
    handler = new LookupDniHandler(
      mockConfig as ConfigService<Environment, true>,
      mockUsers as UserRepository,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects DNI that does not have exactly 8 digits', async () => {
    await expect(handler.execute(new LookupDniQuery('12345'))).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(handler.execute(new LookupDniQuery('abcdefgh'))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws ConflictException if DNI is already registered in DB', async () => {
    mockUsers.findByDni = vi.fn().mockResolvedValue({ id: 'user-1', dni: '70123456' } as never);
    await expect(handler.execute(new LookupDniQuery('70123456'))).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('rejects if RENIEC_TOKEN is not configured', async () => {
    (mockConfig.get as unknown as ReturnType<typeof vi.fn>).mockReturnValue('');
    await expect(handler.execute(new LookupDniQuery('12345678'))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('returns person data on successful API response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        dni: '70123456',
        nombres: 'JUAN CARLOS',
        apellidoPaterno: 'PEREZ',
        apellidoMaterno: 'GOMEZ',
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await handler.execute(new LookupDniQuery('70123456'));

    expect(result).toEqual({
      ok: true,
      nombres: 'JUAN CARLOS',
      apellidoPaterno: 'PEREZ',
      apellidoMaterno: 'GOMEZ',
    });
  });

  it('throws NotFoundException if DNI is not found or names are missing', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(handler.execute(new LookupDniQuery('70123456'))).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws NotFoundException if API response is not ok', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(handler.execute(new LookupDniQuery('70123456'))).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
