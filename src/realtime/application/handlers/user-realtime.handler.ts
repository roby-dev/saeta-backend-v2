import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, type IEventHandler } from '@nestjs/cqrs';
import { UserDisabledEvent } from '../../../users/domain/events/user-disabled.event.js';
import { RealtimeGateway } from '../../presentation/gateways/realtime.gateway.js';

@Injectable()
@EventsHandler(UserDisabledEvent)
export class UserRealtimeHandler implements IEventHandler<UserDisabledEvent> {
  private readonly logger = new Logger(UserRealtimeHandler.name);

  constructor(private readonly gateway: RealtimeGateway) {}

  handle(event: UserDisabledEvent): void {
    this.logger.log(`Handling UserDisabledEvent: #${event.userId}`);
    this.gateway.emitUserDisabled(event.userId);
  }
}
