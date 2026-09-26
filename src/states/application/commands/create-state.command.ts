import type { StateCode } from '../../domain/state-code.enum.js';

export class CreateStateCommand {
  constructor(
    public readonly name: string,
    public readonly code?: StateCode,
  ) {}
}
