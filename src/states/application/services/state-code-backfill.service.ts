import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { StateCode } from '../../domain/state-code.enum.js';
import {
  STATE_REPOSITORY,
  type StateRepository,
} from '../../domain/state.repository.js';

/**
 * Maps a legacy Spanish state name to its StateCode, one time, for states that
 * predate the `code` field. This is the ONLY place in the codebase allowed to
 * match state names; everything else must resolve states by `code`.
 */
export function resolveLegacyStateCode(name: string): StateCode | undefined {
  const normalized = name.toUpperCase();

  if (normalized.includes('PENDIENT')) return StateCode.PENDING;
  if (normalized.includes('PROCESO')) return StateCode.IN_PROGRESS;
  if (normalized.includes('RESUELT')) return StateCode.RESOLVED;
  if (normalized.includes('RECHAZAD') || normalized.includes('CANCELAD')) {
    return StateCode.REJECTED;
  }

  return undefined;
}

@Injectable()
export class StateCodeBackfillService implements OnModuleInit {
  private readonly logger = new Logger(StateCodeBackfillService.name);

  constructor(
    @Inject(STATE_REPOSITORY)
    private readonly states: StateRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.backfill();
  }

  async backfill(): Promise<void> {
    const allStates = await this.states.findAll();

    const takenCodes = new Set<StateCode>(
      allStates
        .filter((state) => state.code)
        .map((state) => state.code as StateCode),
    );

    for (const state of allStates) {
      if (state.code) {
        continue;
      }

      const candidate = resolveLegacyStateCode(state.name);
      if (!candidate || takenCodes.has(candidate)) {
        continue;
      }

      await this.states.update(state.id, state.name, candidate);
      takenCodes.add(candidate);
      this.logger.log(
        `Backfilled code=${candidate} for state "${state.name}" (${state.id})`,
      );
    }
  }
}
