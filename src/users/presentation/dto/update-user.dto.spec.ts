import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { UpdateUserDto } from './update-user.dto.js';

// Reproduces the app-wide ValidationPipe config from main.ts
// (`whitelist: true, forbidNonWhitelisted: true`) at the unit level, so this contract is
// verifiable without bootstrapping the whole Nest app.
async function build(payload: Record<string, unknown>) {
  const dto = plainToInstance(UpdateUserDto, payload);
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  return { dto, errors };
}

describe('UpdateUserDto (citizen self-service PATCH contract)', () => {
  it('accepts own name/lastname/phone/email with no errors', async () => {
    const { errors } = await build({
      name: 'Ana',
      lastname: 'Gomez',
      phone: '987654321',
      email: 'ana@saeta.test',
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects a role field as a non-whitelisted property', async () => {
    const { errors } = await build({ name: 'Ana', role: 'ADMIN' });

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'role')).toBe(true);
  });

  it('rejects an arbitrary unknown field', async () => {
    const { errors } = await build({ name: 'Ana', passwordHash: 'hacked' });

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'passwordHash')).toBe(true);
  });

  it('declares statusAccount as an allowed DTO field (authorization is enforced by UpdateUserHandler, not the DTO)', async () => {
    const { errors } = await build({ statusAccount: 'INHABILITADO' });

    expect(errors).toHaveLength(0);
  });
});
