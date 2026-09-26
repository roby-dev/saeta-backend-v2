import type { StateCode } from '../../domain/state-code.enum.js';

export class UpdateStateCommand {
  constructor(
    public readonly stateId: string,
    public readonly name: string,
    public readonly code?: StateCode,
  ) {}
}
