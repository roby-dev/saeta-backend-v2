import { describe, expect, it, vi } from 'vitest';
import type { UserEntity } from '../../domain/user.entity.js';
import type { UserRepository } from '../../domain/user.repository.js';
import { GetUsersHandler } from './get-users.handler.js';
import { GetUsersQuery } from './get-users.query.js';

describe('GetUsersHandler', () => {
  const mockUsers: UserEntity[] = [
    {
      id: '1',
      name: 'User 1',
      lastname: 'Test',
      dni: '11111111',
      phone: '900000001',
      email: 'u1@saeta.test',
      role: 'CIUDADANO',
      statusAccount: 'HABILITADO',
    },
    {
      id: '2',
      name: 'User 2',
      lastname: 'Test',
      dni: '22222222',
      phone: '900000002',
      email: 'u2@saeta.test',
      role: 'PERSONAL_SEGURIDAD',
      statusAccount: 'HABILITADO',
    },
  ];

  const mockRepo = (): UserRepository => ({
    findById: vi.fn(),
    findByIdWithPassword: vi.fn(),
    findByEmail: vi.fn(),
    findByDni: vi.fn(),
    findByPhone: vi.fn(),
    findMany: vi.fn().mockResolvedValue({ users: mockUsers, total: 2 }),
    findSecurityPersonnel: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updatePassword: vi.fn(),
  });

  it('retrieves paginated users and calculates totalPages', async () => {
    const repo = mockRepo();
    const handler = new GetUsersHandler(repo);

    const result = await handler.execute(new GetUsersQuery(1, 10));

    expect(result.users).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.totalPages).toBe(1);
    expect(repo.findMany).toHaveBeenCalledWith({
      role: undefined,
      statusAccount: undefined,
      search: undefined,
      skip: 0,
      limit: 10,
    });
  });

  it('clamps invalid page and limit values safely and forwards search', async () => {
    const repo = mockRepo();
    const handler = new GetUsersHandler(repo);

    await handler.execute(new GetUsersQuery(-5, 500, undefined, undefined, 'Carlos'));

    expect(repo.findMany).toHaveBeenCalledWith({
      role: undefined,
      statusAccount: undefined,
      search: 'Carlos',
      skip: 0,
      limit: 100, // clamped to max 100
    });
  });
});

