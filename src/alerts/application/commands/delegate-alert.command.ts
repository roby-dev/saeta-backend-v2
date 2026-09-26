export class DelegateAlertCommand {
  constructor(
    public readonly alertId: string,
    public readonly attendedById: string,
    public readonly commentary?: string,
  ) {}
}
