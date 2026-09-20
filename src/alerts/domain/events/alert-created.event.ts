import type { AlertEntity } from '../alert.entity.js';

export class AlertCreatedEvent {
  constructor(public readonly alert: AlertEntity) {}
}
