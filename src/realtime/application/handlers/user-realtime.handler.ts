import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, type IEventHandler } from '@nestjs/cqrs';
import { UserDisabledEvent } from '../../../users/domain/events/user-disabled.event.js';
import { UserProfileUpdatedEvent } from '../../../users/domain/events/user-profile-updated.event.js';
import { RealtimeGateway } from '../../presentation/gateways/realtime.gateway.js';

type UserRealtimeEvent = UserDisabledEvent | UserProfileUpdatedEvent;

@Injectable()
@EventsHandler(UserDisabledEvent, UserProfileUpdatedEvent)
export class UserRealtimeHandler implements IEventHandler<UserRealtimeEvent> {
  private readonly logger = new Logger(UserRealtimeHandler.name);

  constructor(private readonly gateway: RealtimeGateway) {}

  handle(event: UserRealtimeEvent): void {
    if (event instanceof UserProfileUpdatedEvent) {
      this.logger.log(`Handling UserProfileUpdatedEvent: #${event.user.id}`);
      this.gateway.emitUserProfileUpdated(event.user);
      return;
    }

    this.logger.log(`Handling UserDisabledEvent: #${event.userId}`);
    this.gateway.emitUserDisabled(event.userId);
  }
}
