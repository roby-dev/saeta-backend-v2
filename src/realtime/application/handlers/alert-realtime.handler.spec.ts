import { describe, expect, it, vi } from 'vitest';
import { AlertCreatedEvent } from '../../../alerts/domain/events/alert-created.event.js';
import { AlertUpdatedEvent } from '../../../alerts/domain/events/alert-updated.event.js';
import type { AlertEntity } from '../../../alerts/domain/alert.entity.js';
import { AlertRealtimeHandler } from './alert-realtime.handler.js';
import type { RealtimeGateway } from '../../presentation/gateways/realtime.gateway.js';

describe('AlertRealtimeHandler', () => {
  const sampleAlert: AlertEntity = {
    id: 'alert-1',
    userId: 'user-1',
    latitude: -18.01,
    longitude: -70.25,
    typeId: 'type-1',
    stateId: 'state-1',
    creationDate: '19/09/2026,10:00:00',
  };

  it('delegates to gateway.emitAlertCreated when AlertCreatedEvent is received', () => {
    const mockGateway = {
      emitAlertCreated: vi.fn(),
      emitAlertUpdated: vi.fn(),
    } as unknown as RealtimeGateway;

    const handler = new AlertRealtimeHandler(mockGateway);
    handler.handle(new AlertCreatedEvent(sampleAlert));

    expect(mockGateway.emitAlertCreated).toHaveBeenCalledWith(sampleAlert);
    expect(mockGateway.emitAlertUpdated).not.toHaveBeenCalled();
  });

  it('delegates to gateway.emitAlertUpdated when AlertUpdatedEvent is received', () => {
    const mockGateway = {
      emitAlertCreated: vi.fn(),
      emitAlertUpdated: vi.fn(),
    } as unknown as RealtimeGateway;

    const handler = new AlertRealtimeHandler(mockGateway);
    handler.handle(new AlertUpdatedEvent(sampleAlert));

    expect(mockGateway.emitAlertUpdated).toHaveBeenCalledWith(sampleAlert);
    expect(mockGateway.emitAlertCreated).not.toHaveBeenCalled();
  });
});
