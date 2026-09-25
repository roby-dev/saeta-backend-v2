import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { EmergencyContactDto } from './create-user.dto.js';

async function build(phone: unknown) {
  const dto = plainToInstance(EmergencyContactDto, { name: 'Ana', phone });
  const errors = await validate(dto);
  return { dto, errors };
}

describe('EmergencyContactDto phone normalization', () => {
  it.each([
    ['987654321', '987654321'],
    ['987 654 321', '987654321'],
    ['987-654-321', '987654321'],
    ['+51 987 654 321', '987654321'],
    ['+51987654321', '987654321'],
    ['51987654321', '987654321'],
    ['(+51) 987-654-321', '987654321'],
  ])('accepts %s and stores %s', async (input, expected) => {
    const { dto, errors } = await build(input);

    expect(errors).toHaveLength(0);
    expect(dto.phone).toBe(expected);
  });

  it.each(['98765432', '9876543210', '+1 987 654 321', 'abc', ''])(
    'rejects %s',
    async (input) => {
      const { errors } = await build(input);

      expect(errors.length).toBeGreaterThan(0);
    },
  );

  it('rejects a non-string phone', async () => {
    const { errors } = await build(987654321);

    expect(errors.length).toBeGreaterThan(0);
  });
});
