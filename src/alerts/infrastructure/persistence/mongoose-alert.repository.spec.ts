import { describe, expect, it, vi } from 'vitest';
import { StateCode } from '../../../states/domain/state-code.enum.js';
import { MongooseAlertRepository } from './mongoose-alert.repository.js';

// Minimal chainable query stub: every mongoose-style method (sort/skip/limit/populate/lean)
// returns `this`, and `exec` resolves with the value the test configured.
function queryStub(resolvedValue: unknown) {
  const stub = {
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    populate: vi.fn().mockReturnThis(),
    lean: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(resolvedValue),
  };
  return stub;
}

describe('MongooseAlertRepository', () => {
  describe('getStateCode', () => {
    it('returns the code of the given state id', async () => {
      const alertModel = {} as never;
      const stateModel = {
        findById: vi.fn().mockReturnValue(
          queryStub({ _id: 'state-1', name: 'Pendiente', code: StateCode.PENDING }),
        ),
      };

      const repo = new MongooseAlertRepository(alertModel, stateModel as never);
      const code = await repo.getStateCode('507f1f77bcf86cd799439011'.slice(0, 24));

      expect(stateModel.findById).toHaveBeenCalled();
      expect(code).toBe(StateCode.PENDING);
    });

    it('returns null when the state has no code yet', async () => {
      const alertModel = {} as never;
      const stateModel = {
        findById: vi.fn().mockReturnValue(
          queryStub({ _id: 'state-1', name: 'Estado personalizado' }),
        ),
      };

      const repo = new MongooseAlertRepository(alertModel, stateModel as never);
      const code = await repo.getStateCode('507f1f77bcf86cd799439011');

      expect(code).toBeNull();
    });
  });

  describe('findStateIdByCode', () => {
    it('returns the id of the state carrying the requested code', async () => {
      const alertModel = {} as never;
      const stateModel = {
        findOne: vi.fn().mockReturnValue(queryStub({ _id: 'state-pending-id' })),
      };

      const repo = new MongooseAlertRepository(alertModel, stateModel as never);
      const id = await repo.findStateIdByCode(StateCode.PENDING);

      expect(stateModel.findOne).toHaveBeenCalledWith({ code: StateCode.PENDING });
      expect(id).toBe('state-pending-id');
    });

    it('returns null when no state carries that code', async () => {
      const alertModel = {} as never;
      const stateModel = {
        findOne: vi.fn().mockReturnValue(queryStub(null)),
      };

      const repo = new MongooseAlertRepository(alertModel, stateModel as never);
      const id = await repo.findStateIdByCode(StateCode.REJECTED);

      expect(id).toBeNull();
    });
  });

  describe('getDefaultPendingStateId', () => {
    it('resolves the pending state id by code, without a hardcoded fallback', async () => {
      const alertModel = {} as never;
      const stateModel = {
        findOne: vi.fn().mockReturnValue(queryStub(null)),
      };

      const repo = new MongooseAlertRepository(alertModel, stateModel as never);
      const id = await repo.getDefaultPendingStateId();

      expect(stateModel.findOne).toHaveBeenCalledWith({ code: StateCode.PENDING });
      expect(id).toBeNull();
    });
  });

  describe('findMany state counts', () => {
    it('buckets alert counts by state code, not by name', async () => {
      const stateIdPending = 'state-pending';
      const stateIdRenamed = 'state-renamed-but-still-pending';
      const stateIdResolved = 'state-resolved';

      const alertModel = {
        find: vi.fn().mockReturnValue(queryStub([])),
        countDocuments: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue(0) }),
        aggregate: vi.fn().mockResolvedValue([
          { _id: stateIdPending, count: 2 },
          { _id: stateIdRenamed, count: 3 },
          { _id: stateIdResolved, count: 1 },
        ]),
      };
      const stateModel = {
        find: vi.fn().mockReturnValue(
          queryStub([
            { _id: stateIdPending, name: 'Pendiente', code: StateCode.PENDING },
            // Renamed on purpose: no legacy Spanish wording, only the code says PENDING.
            { _id: stateIdRenamed, name: 'Nuevo ingreso', code: StateCode.PENDING },
            { _id: stateIdResolved, name: 'Resuelta', code: StateCode.RESOLVED },
          ]),
        ),
      };

      const repo = new MongooseAlertRepository(alertModel as never, stateModel as never);
      const result = await repo.findMany({});

      expect(result.stateCounts).toEqual({
        pending: 5,
        inProcess: 0,
        resolved: 1,
        rejected: 0,
        total: 6,
      });
    });
  });
});
