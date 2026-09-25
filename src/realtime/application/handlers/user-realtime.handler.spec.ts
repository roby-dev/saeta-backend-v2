import { describe, expect, it, vi } from 'vitest';
import { UserDisabledEvent } from '../../../users/domain/events/user-disabled.event.js';
import { UserProfileUpdatedEvent } from '../../../users/domain/events/user-profile-updated.event.js';
import type { UserEntity } from '../../../users/domain/user.entity.js';
import type { RealtimeGateway } from '../../presentation/gateways/realtime.gateway.js';
import { UserRealtimeHandler } from './user-realtime.handler.js';

describe('UserRealtimeHandler', () => {
  it('delegates to gateway.emitUserDisabled when UserDisabledEvent is received', () => {
    const mockGateway = {
      emitUserDisabled: vi.fn(),
      emitUserProfileUpdated: vi.fn(),
    } as unknown as RealtimeGateway;

    const handler = new UserRealtimeHandler(mockGateway);
    handler.handle(new UserDisabledEvent('user-1'));

    expect(mockGateway.emitUserDisabled).toHaveBeenCalledWith('user-1');
    expect(mockGateway.emitUserProfileUpdated).not.toHaveBeenCalled();
  });

  it('delegates to gateway.emitUserProfileUpdated when UserProfileUpdatedEvent is received', () => {
    const mockGateway = {
      emitUserDisabled: vi.fn(),
      emitUserProfileUpdated: vi.fn(),
    } as unknown as RealtimeGateway;

    const user: UserEntity = {
      id: 'user-1',
      name: 'Ana',
      lastname: 'Gomez',
      dni: '11223344',
      phone: '988776655',
      email: 'ana@saeta.test',
      role: 'CIUDADANO',
      statusAccount: 'HABILITADO',
    };

    const handler = new UserRealtimeHandler(mockGateway);
    handler.handle(new UserProfileUpdatedEvent(user));

    expect(mockGateway.emitUserProfileUpdated).toHaveBeenCalledWith(user);
    expect(mockGateway.emitUserDisabled).not.toHaveBeenCalled();
  });
});
