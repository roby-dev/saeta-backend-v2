import type { JwtService } from '@nestjs/jwt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Server, Socket } from 'socket.io';
import { RealtimeGateway } from './realtime.gateway.js';
import type { AlertEntity } from '../../../alerts/domain/alert.entity.js';

describe('RealtimeGateway', () => {
  let gateway: RealtimeGateway;
  let jwtService: JwtService;
  let mockServer: Partial<Server>;
  let mockClient: Partial<Socket>;

  beforeEach(() => {
    jwtService = {
      verify: vi.fn(),
    } as unknown as JwtService;

    gateway = new RealtimeGateway(jwtService);

    mockServer = {
      emit: vi.fn(),
    };
    gateway.server = mockServer as Server;

    mockClient = {
      id: 'socket-123',
      handshake: {
        auth: {},
        query: {},
        headers: {},
        time: '',
        address: '',
        xdomain: false,
        secure: false,
        issued: 0,
        url: '',
      },
      broadcast: {
        emit: vi.fn(),
      } as unknown as Socket['broadcast'],
    };
  });

  it('handles connection with JWT token for security personnel', () => {
    mockClient.handshake!.auth = { token: 'valid-jwt-token' };
    (jwtService.verify as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      sub: 'user-sec-1',
      role: 'PERSONAL_SEGURIDAD',
    });

    gateway.handleConnection(mockClient as Socket);

    expect(mockClient.broadcast!.emit).toHaveBeenCalledWith(
      'personalConnected',
      'user-sec-1',
    );
    expect(gateway.getActivePersonnel()).toContain('user-sec-1');
  });

  it('handles connection with legacy query id', () => {
    mockClient.handshake!.query = { id: 'legacy-user-2' };

    gateway.handleConnection(mockClient as Socket);

    expect(mockClient.broadcast!.emit).toHaveBeenCalledWith(
      'personalConnected',
      'legacy-user-2',
    );
    expect(gateway.getActivePersonnel()).toContain('legacy-user-2');
  });

  it('handles disconnection and broadcasts personalDisconnected', () => {
    mockClient.handshake!.query = { id: 'user-3' };
    gateway.handleConnection(mockClient as Socket);
    expect(gateway.getActivePersonnel()).toContain('user-3');

    gateway.handleDisconnect(mockClient as Socket);

    expect(mockServer.emit).toHaveBeenCalledWith('personalDisconnected', 'user-3');
    expect(gateway.getActivePersonnel()).not.toContain('user-3');
  });

  it('broadcasts updateLocation when receiving location message', () => {
    const userPayload = { id: 'user-1', name: 'Officer' };
    const coords = [-18.01, -70.25];

    gateway.handleUpdateLocation(mockClient as Socket, [userPayload, coords]);

    expect(mockClient.broadcast!.emit).toHaveBeenCalledWith(
      'updateLocation',
      userPayload,
      coords,
    );
  });

  it('broadcasts updatePersonalState', () => {
    const statePayload = { id: 'user-1', availability: 'OCUPADO' };
    gateway.handleUpdatePersonalState(mockClient as Socket, statePayload);

    expect(mockClient.broadcast!.emit).toHaveBeenCalledWith(
      'updatePersonalState',
      statePayload,
    );
  });

  it('broadcasts updatedAlert from client', () => {
    const alertPayload = { id: 'alert-1', stateId: 'st-2' };
    gateway.handleClientUpdatedAlert(mockClient as Socket, alertPayload);

    expect(mockClient.broadcast!.emit).toHaveBeenCalledWith(
      'updatedAlert',
      alertPayload,
    );
  });

  it('emits sendAlert to all clients on emitAlertCreated', () => {
    const alert: AlertEntity = {
      id: 'alert-new',
      userId: 'user-c',
      latitude: -18.01,
      longitude: -70.25,
      typeId: 'type-1',
      stateId: 'state-1',
      creationDate: '19/09/2026,12:00:00',
    };

    gateway.emitAlertCreated(alert);

    expect(mockServer.emit).toHaveBeenCalledWith('sendAlert', alert);
  });

  it('emits updatedAlert and user/attended specific events on emitAlertUpdated', () => {
    const alert: AlertEntity = {
      id: 'alert-updated',
      userId: 'user-c',
      attendedById: 'user-sec',
      latitude: -18.01,
      longitude: -70.25,
      typeId: 'type-1',
      stateId: 'state-2',
      creationDate: '19/09/2026,12:00:00',
    };

    gateway.emitAlertUpdated(alert);

    expect(mockServer.emit).toHaveBeenCalledWith('updatedAlert', alert);
    expect(mockServer.emit).toHaveBeenCalledWith('updatedAlert-user-c', alert);
    expect(mockServer.emit).toHaveBeenCalledWith('delegateAlert-user-sec', alert);
  });
});
