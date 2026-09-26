import { describe, expect, it, vi } from 'vitest';
import { StateCode } from '../../domain/state-code.enum.js';
import type { StateRepository } from '../../domain/state.repository.js';
import {
  resolveLegacyStateCode,
  StateCodeBackfillService,
} from './state-code-backfill.service.js';

describe('resolveLegacyStateCode', () => {
  it('maps legacy Spanish state names to their state code', () => {
    expect(resolveLegacyStateCode('Pendiente')).toBe(StateCode.PENDING);
    expect(resolveLegacyStateCode('En proceso')).toBe(StateCode.IN_PROGRESS);
    expect(resolveLegacyStateCode('Resuelta')).toBe(StateCode.RESOLVED);
    expect(resolveLegacyStateCode('Rechazada')).toBe(StateCode.REJECTED);
    expect(resolveLegacyStateCode('Cancelada')).toBe(StateCode.REJECTED);
  });

  it('returns undefined for a name that matches no known mapping', () => {
    expect(resolveLegacyStateCode('Estado personalizado')).toBeUndefined();
  });
});

describe('StateCodeBackfillService', () => {
  const mockRepo = (states: Array<{ id: string; name: string; code?: StateCode }>): StateRepository => ({
    findAll: vi.fn().mockResolvedValue(states),
    findById: vi.fn(),
    findByName: vi.fn(),
    findByCode: vi.fn(),
    create: vi.fn(),
    update: vi.fn().mockImplementation((id, name, code) => Promise.resolve({ id, name, code })),
  });

  it('assigns codes by name to states that have none', async () => {
    const repo = mockRepo([
      { id: '1', name: 'Pendiente' },
      { id: '2', name: 'En proceso' },
      { id: '3', name: 'Resuelta' },
      { id: '4', name: 'Rechazada' },
    ]);
    const service = new StateCodeBackfillService(repo);

    await service.backfill();

    expect(repo.update).toHaveBeenCalledWith('1', 'Pendiente', StateCode.PENDING);
    expect(repo.update).toHaveBeenCalledWith('2', 'En proceso', StateCode.IN_PROGRESS);
    expect(repo.update).toHaveBeenCalledWith('3', 'Resuelta', StateCode.RESOLVED);
    expect(repo.update).toHaveBeenCalledWith('4', 'Rechazada', StateCode.REJECTED);
  });

  it('is idempotent: skips states that already have a code', async () => {
    const repo = mockRepo([
      { id: '1', name: 'Pendiente', code: StateCode.PENDING },
      { id: '2', name: 'En proceso' },
    ]);
    const service = new StateCodeBackfillService(repo);

    await service.backfill();

    expect(repo.update).not.toHaveBeenCalledWith('1', 'Pendiente', expect.anything());
    expect(repo.update).toHaveBeenCalledWith('2', 'En proceso', StateCode.IN_PROGRESS);
  });

  it('skips a candidate code that is already taken by another state', async () => {
    const repo = mockRepo([
      { id: '1', name: 'Pendiente Legacy', code: StateCode.PENDING },
      { id: '2', name: 'Pendiente Duplicada' },
    ]);
    const service = new StateCodeBackfillService(repo);

    await service.backfill();

    expect(repo.update).not.toHaveBeenCalled();
  });

  it('does not touch a state whose name matches no known mapping', async () => {
    const repo = mockRepo([{ id: '1', name: 'Estado personalizado' }]);
    const service = new StateCodeBackfillService(repo);

    await service.backfill();

    expect(repo.update).not.toHaveBeenCalled();
  });
});
