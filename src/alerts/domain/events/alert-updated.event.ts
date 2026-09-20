import type { AlertEntity } from '../alert.entity.js';

export class AlertUpdatedEvent {
  constructor(public readonly alert: AlertEntity) {}
}
