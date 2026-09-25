import { describe, expect, it, vi } from 'vitest';
import { UserDisabledEvent } from '../../../users/domain/events/user-disabled.event.js';
import type { RealtimeGateway } from '../../presentation/gateways/realtime.gateway.js';
import { UserRealtimeHandler } from './user-realtime.handler.js';

describe('UserRealtimeHandler', () => {
  it('delegates to gateway.emitUserDisabled when UserDisabledEvent is received', () => {
    const mockGateway = {
      emitUserDisabled: vi.fn(),
    } as unknown as RealtimeGateway;

    const handler = new UserRealtimeHandler(mockGateway);
    handler.handle(new UserDisabledEvent('user-1'));

    expect(mockGateway.emitUserDisabled).toHaveBeenCalledWith('user-1');
  });
});
