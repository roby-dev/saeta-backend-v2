export class RejectAlertCommand {
  constructor(
    public readonly alertId: string,
    public readonly commentary?: string,
  ) {}
}
