export class CreateTypeCommand {
  constructor(
    public readonly name: string,
    public readonly priority?: number,
  ) {}
}
