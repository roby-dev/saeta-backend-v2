export class CreateTempCommand {
  constructor(
    public readonly userId: string,
    public readonly tempPassword: string,
    public readonly date?: string,
  ) {}
}
