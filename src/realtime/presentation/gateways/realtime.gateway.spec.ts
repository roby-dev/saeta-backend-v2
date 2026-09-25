import type { JwtService } from '@nestjs/jwt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Server, Socket } from 'socket.io';
import { RealtimeGateway } from './realtime.gateway.js';
import type { AlertEntity } from '../../../alerts/domain/alert.entity.js';

describe('RealtimeGateway', () => {
  let gateway: RealtimeGateway;
  let jwtService: JwtService;
  let mockServer: Partial<Server>;
  let toEmit: ReturnType<typeof vi.fn>;
  let disconnectSockets: ReturnType<typeof vi.fn>;
  let mockClient: Partial<Socket>;

  beforeEach(() => {
    jwtService = {
      verify: vi.fn(),
    } as unknown as JwtService;

    gateway = new RealtimeGateway(jwtService);

    toEmit = vi.fn();
    disconnectSockets = vi.fn();
    mockServer = {
      emit: vi.fn(),
      to: vi.fn().mockReturnValue({ emit: toEmit }),
      in: vi.fn().mockReturnValue({ disconnectSockets }),
    };
    gateway.server = mockServer as Server;

    mockClient = {
      id: 'socket-123',
      data: {},
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
      join: vi.fn(),
      disconnect: vi.fn(),
      broadcast: {
        emit: vi.fn(),
      } as unknown as Socket['broadcast'],
    };
  });

  describe('handleConnection', () => {
    it('disconnects a socket with no token', () => {
      gateway.handleConnection(mockClient as Socket);

      expect(mockClient.disconnect).toHaveBeenCalledWith(true);
      expect(mockClient.join).not.toHaveBeenCalled();
      expect(gateway.getActivePersonnel()).toHaveLength(0);
    });

    it('disconnects a socket whose token fails verification', () => {
      mockClient.handshake!.auth = { token: 'bad-token' };
      (jwtService.verify as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('invalid signature');
      });

      gateway.handleConnection(mockClient as Socket);

      expect(mockClient.disconnect).toHaveBeenCalledWith(true);
      expect(mockClient.join).not.toHaveBeenCalled();
    });

    it('disconnects a socket presenting a refresh token', () => {
      mockClient.handshake!.auth = { token: 'refresh-token' };
      (jwtService.verify as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        sub: 'user-1',
        role: 'CIUDADANO',
        tokenType: 'refresh',
      });

      gateway.handleConnection(mockClient as Socket);

      expect(mockClient.disconnect).toHaveBeenCalledWith(true);
      expect(mockClient.join).not.toHaveBeenCalled();
    });

    it('ignores legacy query.id and disconnects when no token is present', () => {
      mockClient.handshake!.query = { id: 'legacy-user-2' };

      gateway.handleConnection(mockClient as Socket);

      expect(jwtService.verify).not.toHaveBeenCalled();
      expect(mockClient.disconnect).toHaveBeenCalledWith(true);
      expect(gateway.getActivePersonnel()).not.toContain('legacy-user-2');
    });

    it('authenticates a citizen socket and joins user/role rooms without personnel presence', () => {
      mockClient.handshake!.auth = { token: 'valid-jwt-token' };
      (jwtService.verify as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        sub: 'user-c-1',
        role: 'CIUDADANO',
      });

      gateway.handleConnection(mockClient as Socket);

      expect(mockClient.disconnect).not.toHaveBeenCalled();
      expect(mockClient.join).toHaveBeenCalledWith('user:user-c-1');
      expect(mockClient.join).toHaveBeenCalledWith('role:CIUDADANO');
      expect(mockClient.data).toEqual({ userId: 'user-c-1', role: 'CIUDADANO' });
      expect(mockServer.to).not.toHaveBeenCalled();
      expect(gateway.getActivePersonnel()).toHaveLength(0);
    });

    it('authenticates security personnel, joins rooms, and announces presence to staff rooms', () => {
      mockClient.handshake!.auth = { token: 'valid-jwt-token' };
      (jwtService.verify as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        sub: 'user-sec-1',
        role: 'PERSONAL_SEGURIDAD',
      });

      gateway.handleConnection(mockClient as Socket);

      expect(mockClient.join).toHaveBeenCalledWith('user:user-sec-1');
      expect(mockClient.join).toHaveBeenCalledWith('role:PERSONAL_SEGURIDAD');
      expect(mockServer.to).toHaveBeenCalledWith(['role:ADMIN', 'role:BASE_SEGURIDAD']);
      expect(toEmit).toHaveBeenCalledWith('personalConnected', 'user-sec-1');
      expect(gateway.getActivePersonnel()).toContain('user-sec-1');
    });

    it('accepts a token supplied via handshake.query.token', () => {
      mockClient.handshake!.query = { token: 'valid-jwt-token' };
      (jwtService.verify as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        sub: 'user-c-2',
        role: 'CIUDADANO',
      });

      gateway.handleConnection(mockClient as Socket);

      expect(mockClient.disconnect).not.toHaveBeenCalled();
      expect(mockClient.join).toHaveBeenCalledWith('user:user-c-2');
    });
  });

  describe('handleDisconnect', () => {
    it('notifies staff rooms when security personnel disconnects', () => {
      mockClient.handshake!.auth = { token: 'valid-jwt-token' };
      (jwtService.verify as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        sub: 'user-sec-1',
        role: 'PERSONAL_SEGURIDAD',
      });
      gateway.handleConnection(mockClient as Socket);

      gateway.handleDisconnect(mockClient as Socket);

      expect(mockServer.to).toHaveBeenCalledWith(['role:ADMIN', 'role:BASE_SEGURIDAD']);
      expect(toEmit).toHaveBeenCalledWith('personalDisconnected', 'user-sec-1');
      expect(gateway.getActivePersonnel()).not.toContain('user-sec-1');
    });

    it('does not announce presence when a citizen socket disconnects', () => {
      mockClient.handshake!.auth = { token: 'valid-jwt-token' };
      (jwtService.verify as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        sub: 'user-c-1',
        role: 'CIUDADANO',
      });
      gateway.handleConnection(mockClient as Socket);
      (mockServer.to as ReturnType<typeof vi.fn>).mockClear();

      gateway.handleDisconnect(mockClient as Socket);

      expect(mockServer.to).not.toHaveBeenCalled();
    });
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
