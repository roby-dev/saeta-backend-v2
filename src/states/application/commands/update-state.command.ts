export class UpdateStateCommand {
  constructor(
    public readonly stateId: string,
    public readonly name: string,
  ) {}
}
