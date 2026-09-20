import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, type IEventHandler } from '@nestjs/cqrs';
import { AlertCreatedEvent } from '../../../alerts/domain/events/alert-created.event.js';
import { AlertUpdatedEvent } from '../../../alerts/domain/events/alert-updated.event.js';
import { RealtimeGateway } from '../../presentation/gateways/realtime.gateway.js';

@Injectable()
@EventsHandler(AlertCreatedEvent, AlertUpdatedEvent)
export class AlertRealtimeHandler
  implements IEventHandler<AlertCreatedEvent | AlertUpdatedEvent>
{
  private readonly logger = new Logger(AlertRealtimeHandler.name);

  constructor(private readonly gateway: RealtimeGateway) {}

  handle(event: AlertCreatedEvent | AlertUpdatedEvent): void {
    if (event instanceof AlertCreatedEvent) {
      this.logger.log(`Handling AlertCreatedEvent: #${event.alert.id}`);
      this.gateway.emitAlertCreated(event.alert);
    } else if (event instanceof AlertUpdatedEvent) {
      this.logger.log(`Handling AlertUpdatedEvent: #${event.alert.id}`);
      this.gateway.emitAlertUpdated(event.alert);
    }
  }
}
