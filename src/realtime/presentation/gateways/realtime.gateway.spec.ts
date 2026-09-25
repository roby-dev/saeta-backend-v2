import type { JwtService } from '@nestjs/jwt';
import type { QueryBus } from '@nestjs/cqrs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Server, Socket } from 'socket.io';
import { RealtimeGateway } from './realtime.gateway.js';
import type { AlertEntity } from '../../../alerts/domain/alert.entity.js';
import type { UserEntity } from '../../../users/domain/user.entity.js';

describe('RealtimeGateway', () => {
  let gateway: RealtimeGateway;
  let jwtService: JwtService;
  let queryBus: QueryBus;
  let mockServer: Partial<Server>;
  let toEmit: ReturnType<typeof vi.fn>;
  let disconnectSockets: ReturnType<typeof vi.fn>;
  let mockClient: Partial<Socket>;

  beforeEach(() => {
    jwtService = {
      verify: vi.fn(),
    } as unknown as JwtService;

    queryBus = {
      execute: vi.fn(),
    } as unknown as QueryBus;

    gateway = new RealtimeGateway(jwtService, queryBus);

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
    it('disconnects a socket with no token', async () => {
      await gateway.handleConnection(mockClient as Socket);

      expect(mockClient.disconnect).toHaveBeenCalledWith(true);
      expect(mockClient.join).not.toHaveBeenCalled();
      expect(gateway.getActivePersonnel()).toHaveLength(0);
    });

    it('disconnects a socket whose token fails verification', async () => {
      mockClient.handshake!.auth = { token: 'bad-token' };
      (jwtService.verify as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('invalid signature');
      });

      await gateway.handleConnection(mockClient as Socket);

      expect(mockClient.disconnect).toHaveBeenCalledWith(true);
      expect(mockClient.join).not.toHaveBeenCalled();
    });

    it('disconnects a socket presenting a refresh token', async () => {
      mockClient.handshake!.auth = { token: 'refresh-token' };
      (jwtService.verify as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        sub: 'user-1',
        role: 'CIUDADANO',
        tokenType: 'refresh',
      });

      await gateway.handleConnection(mockClient as Socket);

      expect(mockClient.disconnect).toHaveBeenCalledWith(true);
      expect(mockClient.join).not.toHaveBeenCalled();
    });

    it('ignores legacy query.id and disconnects when no token is present', async () => {
      mockClient.handshake!.query = { id: 'legacy-user-2' };

      await gateway.handleConnection(mockClient as Socket);

      expect(jwtService.verify).not.toHaveBeenCalled();
      expect(mockClient.disconnect).toHaveBeenCalledWith(true);
      expect(gateway.getActivePersonnel()).not.toContain('legacy-user-2');
    });

    it('authenticates a citizen socket and joins user/role rooms without personnel presence', async () => {
      mockClient.handshake!.auth = { token: 'valid-jwt-token' };
      (jwtService.verify as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        sub: 'user-c-1',
        role: 'CIUDADANO',
      });

      await gateway.handleConnection(mockClient as Socket);

      expect(mockClient.disconnect).not.toHaveBeenCalled();
      expect(mockClient.join).toHaveBeenCalledWith('user:user-c-1');
      expect(mockClient.join).toHaveBeenCalledWith('role:CIUDADANO');
      expect(mockClient.data).toEqual({ userId: 'user-c-1', role: 'CIUDADANO' });
      expect(mockServer.to).not.toHaveBeenCalled();
      expect(gateway.getActivePersonnel()).toHaveLength(0);
    });

    it('does not look up a profile for a citizen socket', async () => {
      mockClient.handshake!.auth = { token: 'valid-jwt-token' };
      (jwtService.verify as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        sub: 'user-c-1',
        role: 'CIUDADANO',
      });

      await gateway.handleConnection(mockClient as Socket);

      expect(queryBus.execute).not.toHaveBeenCalled();
    });

    it('authenticates security personnel, joins rooms, announces presence, and caches its DB profile', async () => {
      mockClient.handshake!.auth = { token: 'valid-jwt-token' };
      (jwtService.verify as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        sub: 'user-sec-1',
        role: 'PERSONAL_SEGURIDAD',
      });
      (queryBus.execute as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'user-sec-1',
        name: 'Carlos',
        lastname: 'Rivera',
      } as UserEntity);

      await gateway.handleConnection(mockClient as Socket);

      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          targetUserId: 'user-sec-1',
          currentUserId: 'user-sec-1',
          currentUserRole: 'PERSONAL_SEGURIDAD',
        }),
      );
      expect(mockClient.join).toHaveBeenCalledWith('user:user-sec-1');
      expect(mockClient.join).toHaveBeenCalledWith('role:PERSONAL_SEGURIDAD');
      expect(mockServer.to).toHaveBeenCalledWith(['role:ADMIN', 'role:BASE_SEGURIDAD']);
      expect(toEmit).toHaveBeenCalledWith('personalConnected', 'user-sec-1');
      expect(gateway.getActivePersonnel()).toContain('user-sec-1');
      expect(mockClient.data).toEqual({
        userId: 'user-sec-1',
        role: 'PERSONAL_SEGURIDAD',
        name: 'Carlos',
        lastname: 'Rivera',
      });
    });

    it('keeps connecting with only the session id when the profile lookup fails', async () => {
      mockClient.handshake!.auth = { token: 'valid-jwt-token' };
      (jwtService.verify as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        sub: 'user-sec-2',
        role: 'PERSONAL_SEGURIDAD',
      });
      (queryBus.execute as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('db down'));

      await gateway.handleConnection(mockClient as Socket);

      expect(mockClient.disconnect).not.toHaveBeenCalled();
      expect(mockClient.join).toHaveBeenCalledWith('user:user-sec-2');
      expect(mockClient.data).toEqual({ userId: 'user-sec-2', role: 'PERSONAL_SEGURIDAD' });
      expect(gateway.getActivePersonnel()).toContain('user-sec-2');
    });

    it('accepts a token supplied via handshake.query.token', async () => {
      mockClient.handshake!.query = { token: 'valid-jwt-token' };
      (jwtService.verify as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        sub: 'user-c-2',
        role: 'CIUDADANO',
      });

      await gateway.handleConnection(mockClient as Socket);

      expect(mockClient.disconnect).not.toHaveBeenCalled();
      expect(mockClient.join).toHaveBeenCalledWith('user:user-c-2');
    });
  });

  describe('handleDisconnect', () => {
    it('notifies staff rooms when security personnel disconnects', async () => {
      mockClient.handshake!.auth = { token: 'valid-jwt-token' };
      (jwtService.verify as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        sub: 'user-sec-1',
        role: 'PERSONAL_SEGURIDAD',
      });
      (queryBus.execute as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'user-sec-1',
        name: 'Carlos',
        lastname: 'Rivera',
      } as UserEntity);
      await gateway.handleConnection(mockClient as Socket);

      gateway.handleDisconnect(mockClient as Socket);

      expect(mockServer.to).toHaveBeenCalledWith(['role:ADMIN', 'role:BASE_SEGURIDAD']);
      expect(toEmit).toHaveBeenCalledWith('personalDisconnected', 'user-sec-1');
      expect(gateway.getActivePersonnel()).not.toContain('user-sec-1');
    });

    it('does not announce presence when a citizen socket disconnects', async () => {
      mockClient.handshake!.auth = { token: 'valid-jwt-token' };
      (jwtService.verify as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        sub: 'user-c-1',
        role: 'CIUDADANO',
      });
      await gateway.handleConnection(mockClient as Socket);
      (mockServer.to as ReturnType<typeof vi.fn>).mockClear();

      gateway.handleDisconnect(mockClient as Socket);

      expect(mockServer.to).not.toHaveBeenCalled();
    });
  });

  describe('handleUpdateLocation', () => {
    beforeEach(() => {
      mockClient.data = { userId: 'user-sec-1', role: 'PERSONAL_SEGURIDAD' };
    });

    it('forwards a validated location update from personnel to staff rooms using the session identity', () => {
      gateway.handleUpdateLocation(mockClient as Socket, [-18.01, -70.25]);

      expect(mockServer.to).toHaveBeenCalledWith(['role:ADMIN', 'role:BASE_SEGURIDAD']);
      expect(toEmit).toHaveBeenCalledWith('updateLocation', { id: 'user-sec-1' }, [
        -18.01, -70.25,
      ]);
    });

    it('accepts an object payload with lat/lng fields', () => {
      gateway.handleUpdateLocation(mockClient as Socket, { lat: -18.01, lng: -70.25 });

      expect(toEmit).toHaveBeenCalledWith('updateLocation', { id: 'user-sec-1' }, [
        -18.01, -70.25,
      ]);
    });

    it('ignores a spoofed identity in the payload and always forwards the session userId', () => {
      gateway.handleUpdateLocation(mockClient as Socket, {
        lat: -18.01,
        lng: -70.25,
        user: { id: 'someone-else' },
      });

      expect(toEmit).toHaveBeenCalledWith('updateLocation', { id: 'user-sec-1' }, [
        -18.01, -70.25,
      ]);
    });

    it('includes the DB-cached name/lastname in the emitted identity when available', () => {
      mockClient.data = {
        userId: 'user-sec-1',
        role: 'PERSONAL_SEGURIDAD',
        name: 'Carlos',
        lastname: 'Rivera',
      };

      gateway.handleUpdateLocation(mockClient as Socket, [-18.01, -70.25]);

      expect(toEmit).toHaveBeenCalledWith(
        'updateLocation',
        { id: 'user-sec-1', name: 'Carlos', lastname: 'Rivera' },
        [-18.01, -70.25],
      );
    });

    it('ignores a spoofed name/lastname in the payload and always forwards the session-cached identity', () => {
      mockClient.data = {
        userId: 'user-sec-1',
        role: 'PERSONAL_SEGURIDAD',
        name: 'Carlos',
        lastname: 'Rivera',
      };

      gateway.handleUpdateLocation(mockClient as Socket, {
        lat: -18.01,
        lng: -70.25,
        name: 'Fake',
        lastname: 'Name',
      });

      expect(toEmit).toHaveBeenCalledWith(
        'updateLocation',
        { id: 'user-sec-1', name: 'Carlos', lastname: 'Rivera' },
        [-18.01, -70.25],
      );
    });

    it('ignores an update from a non-personnel socket', () => {
      mockClient.data = { userId: 'user-c-1', role: 'CIUDADANO' };

      gateway.handleUpdateLocation(mockClient as Socket, [-18.01, -70.25]);

      expect(mockServer.to).not.toHaveBeenCalled();
      expect(toEmit).not.toHaveBeenCalled();
    });

    it('ignores an update from an unauthenticated socket', () => {
      mockClient.data = {};

      gateway.handleUpdateLocation(mockClient as Socket, [-18.01, -70.25]);

      expect(mockServer.to).not.toHaveBeenCalled();
    });

    it('ignores an out-of-range coordinate payload', () => {
      gateway.handleUpdateLocation(mockClient as Socket, [999, -70.25]);

      expect(mockServer.to).not.toHaveBeenCalled();
    });

    it('ignores a malformed payload', () => {
      gateway.handleUpdateLocation(mockClient as Socket, { foo: 'bar' });

      expect(mockServer.to).not.toHaveBeenCalled();
    });
  });

  describe('handleUpdatePersonalState', () => {
    beforeEach(() => {
      mockClient.data = { userId: 'user-sec-1', role: 'PERSONAL_SEGURIDAD' };
    });

    it('forwards a validated state update from personnel to staff rooms using the session identity', () => {
      gateway.handleUpdatePersonalState(mockClient as Socket, { availability: 'OCUPADO' });

      expect(mockServer.to).toHaveBeenCalledWith(['role:ADMIN', 'role:BASE_SEGURIDAD']);
      expect(toEmit).toHaveBeenCalledWith('updatePersonalState', {
        id: 'user-sec-1',
        availability: 'OCUPADO',
      });
    });

    it('ignores an update from a non-personnel socket', () => {
      mockClient.data = { userId: 'user-c-1', role: 'CIUDADANO' };

      gateway.handleUpdatePersonalState(mockClient as Socket, { availability: 'OCUPADO' });

      expect(mockServer.to).not.toHaveBeenCalled();
    });

    it('ignores a payload without a valid availability field', () => {
      gateway.handleUpdatePersonalState(mockClient as Socket, { availability: '' });

      expect(mockServer.to).not.toHaveBeenCalled();
    });
  });

  it('no longer registers a client-relay handler for updatedAlert', () => {
    expect((gateway as unknown as { handleClientUpdatedAlert?: unknown })
      .handleClientUpdatedAlert).toBeUndefined();
  });

  describe('emitAlertCreated', () => {
    it('emits sendAlert only to staff rooms', () => {
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

      expect(mockServer.to).toHaveBeenCalledWith(['role:ADMIN', 'role:BASE_SEGURIDAD']);
      expect(toEmit).toHaveBeenCalledWith('sendAlert', alert);
      expect(mockServer.emit).not.toHaveBeenCalled();
    });
  });

  describe('emitAlertUpdated', () => {
    it('emits updatedAlert to staff rooms and the owner citizen, and delegateAlert to the assignee', () => {
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

      expect(mockServer.to).toHaveBeenCalledWith(['role:ADMIN', 'role:BASE_SEGURIDAD']);
      expect(mockServer.to).toHaveBeenCalledWith('user:user-c');
      expect(mockServer.to).toHaveBeenCalledWith('user:user-sec');
      expect(toEmit).toHaveBeenCalledWith('updatedAlert', alert);
      expect(toEmit).toHaveBeenCalledWith('delegateAlert', alert);
      expect(mockServer.emit).not.toHaveBeenCalled();
    });

    it('does not target a delegateAlert room when the alert has no assignee', () => {
      const alert: AlertEntity = {
        id: 'alert-updated-2',
        userId: 'user-c',
        latitude: -18.01,
        longitude: -70.25,
        typeId: 'type-1',
        stateId: 'state-2',
        creationDate: '19/09/2026,12:00:00',
      };

      gateway.emitAlertUpdated(alert);

      expect(mockServer.to).toHaveBeenCalledWith('user:user-c');
      expect(toEmit).not.toHaveBeenCalledWith('delegateAlert', alert);
    });
  });

  describe('emitUserDisabled', () => {
    it('notifies only the target user room and force-disconnects that room', () => {
      gateway.emitUserDisabled('user-c');

      expect(mockServer.to).toHaveBeenCalledWith('user:user-c');
      expect(toEmit).toHaveBeenCalledWith('disableUser', 'Su cuenta ha sido deshabilitada');
      expect(mockServer.in).toHaveBeenCalledWith('user:user-c');
      expect(disconnectSockets).toHaveBeenCalled();
      expect(mockServer.emit).not.toHaveBeenCalled();
    });
  });

  describe('emitUserProfileUpdated', () => {
    const baseUser: UserEntity = {
      id: 'user-c',
      name: 'Ana',
      lastname: 'Gomez',
      dni: '11223344',
      phone: '988776655',
      email: 'ana@saeta.test',
      role: 'CIUDADANO',
      statusAccount: 'HABILITADO',
      image: 'avatar.png',
      emergencyContacts: [{ name: 'Mom', phone: '999888777' }],
      availability: undefined,
    };

    it('emits updatedProfile only to the owning user room', () => {
      gateway.emitUserProfileUpdated(baseUser);

      expect(mockServer.to).toHaveBeenCalledWith('user:user-c');
      expect(toEmit).toHaveBeenCalledWith('updatedProfile', expect.objectContaining({
        id: 'user-c',
        name: 'Ana',
        lastname: 'Gomez',
        image: 'avatar.png',
        emergencyContacts: [{ name: 'Mom', phone: '999888777' }],
      }));
      expect(mockServer.emit).not.toHaveBeenCalled();
    });

    it('never includes a passwordHash even if present on the source object', () => {
      const userWithLeakedHash = {
        ...baseUser,
        passwordHash: 'super-secret-hash',
      } as UserEntity & { passwordHash: string };

      gateway.emitUserProfileUpdated(userWithLeakedHash);

      const [, emittedUser] = toEmit.mock.calls[0] as [string, Record<string, unknown>];
      expect(emittedUser.passwordHash).toBeUndefined();
    });
  });
});
