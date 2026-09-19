export class UpdateTypeCommand {
  constructor(
    public readonly typeId: string,
    public readonly name?: string,
    public readonly priority?: number,
  ) {}
}
