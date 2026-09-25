import { Logger } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import {
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  type OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { AlertEntity } from '../../../alerts/domain/alert.entity.js';
import type { AccessTokenPayload } from '../../../auth/application/commands/sign-in.command.js';
import { GetUserByIdQuery } from '../../../users/application/queries/get-user-by-id.query.js';
import type { UserEntity, UserRole } from '../../../users/domain/user.entity.js';

export interface ConnectedUserSession {
  socketId: string;
  userId: string;
  role?: string;
}

interface RealtimeSocketData {
  userId: string;
  role?: string;
  name?: string;
  lastname?: string;
}

const STAFF_ROLES = ['ADMIN', 'BASE_SEGURIDAD'] as const;

function userRoom(userId: string): string {
  return `user:${userId}`;
}

function roleRoom(role: string): string {
  return `role:${role}`;
}

function staffRooms(): string[] {
  return STAFF_ROLES.map(roleRoom);
}

export function resolveCorsOrigin(): string[] | boolean {
  const raw = process.env.CORS_ORIGIN ?? '*';
  return raw === '*' ? true : raw.split(',').map((origin) => origin.trim());
}

function parseCoordinates(payload: unknown): [number, number] | undefined {
  let lat: unknown;
  let lng: unknown;

  if (Array.isArray(payload)) {
    [lat, lng] = payload;
  } else if (payload !== null && typeof payload === 'object') {
    const p = payload as Record<string, unknown>;
    lat = p.lat ?? p.latitude;
    lng = p.lng ?? p.longitude;
  }

  if (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  ) {
    return [lat, lng];
  }

  return undefined;
}

// Whitelist of known-safe UserEntity fields for realtime broadcast. Explicit picking (rather
// than a generic object spread) is defense-in-depth against passwordHash or any other
// unexpected field ever reaching a client, even though UserEntity itself carries no password.
function sanitizeUserForBroadcast(user: UserEntity): UserEntity {
  return {
    id: user.id,
    name: user.name,
    lastname: user.lastname,
    dni: user.dni,
    phone: user.phone,
    email: user.email,
    role: user.role,
    statusAccount: user.statusAccount,
    image: user.image,
    emergencyContacts: user.emergencyContacts,
    averageScore: user.averageScore,
    alertsAttended: user.alertsAttended,
    availability: user.availability,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function parseAvailability(payload: unknown): string | undefined {
  if (payload !== null && typeof payload === 'object' && 'availability' in payload) {
    const value = (payload as { availability: unknown }).availability;
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }

  return undefined;
}

@WebSocketGateway({
  cors: {
    origin: resolveCorsOrigin(),
  },
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly connectedUsers = new Map<string, ConnectedUserSession>();
  private readonly activePersonnel = new Set<string>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly queryBus: QueryBus,
  ) {}

  afterInit(_server: Server): void {
    this.logger.log('RealtimeGateway initialized - WebSockets listening');
  }

  async handleConnection(client: Socket): Promise<void> {
    const session = this.authenticate(client);

    if (!session) {
      this.logger.warn(`Rejecting unauthenticated connection [id=${client.id}]`);
      client.disconnect(true);
      return;
    }

    const data: RealtimeSocketData = { userId: session.userId, role: session.role };

    if (session.role === 'PERSONAL_SEGURIDAD') {
      const profile = await this.loadPersonnelProfile(session.userId, session.role);
      if (profile) {
        data.name = profile.name;
        data.lastname = profile.lastname;
      }
    }

    client.data = data;

    void client.join(userRoom(session.userId));
    if (session.role) {
      void client.join(roleRoom(session.role));
    }

    this.connectedUsers.set(client.id, {
      socketId: client.id,
      userId: session.userId,
      role: session.role,
    });

    if (session.role === 'PERSONAL_SEGURIDAD') {
      this.activePersonnel.add(session.userId);
      this.logger.log(`Personal connected: ${session.userId}`);
      this.server.to(staffRooms()).emit('personalConnected', session.userId);
    }

    this.logger.log(`Client connected [id=${client.id}] (total: ${this.connectedUsers.size})`);
  }

  handleDisconnect(client: Socket): void {
    const session = this.connectedUsers.get(client.id);
    if (session) {
      this.connectedUsers.delete(client.id);

      if (this.activePersonnel.has(session.userId)) {
        this.activePersonnel.delete(session.userId);
        this.logger.log(`Personal disconnected: ${session.userId}`);
        this.server.to(staffRooms()).emit('personalDisconnected', session.userId);
      }
    }

    this.logger.log(`Client disconnected [id=${client.id}]`);
  }

  private authenticate(client: Socket): { userId: string; role?: string } | undefined {
    const rawToken = this.extractToken(client);
    if (!rawToken) {
      return undefined;
    }

    try {
      const payload = this.jwtService.verify<AccessTokenPayload>(rawToken);
      if ((payload as { tokenType?: string }).tokenType === 'refresh') {
        return undefined;
      }
      if (!payload?.sub) {
        return undefined;
      }
      return { userId: payload.sub, role: payload.role };
    } catch {
      return undefined;
    }
  }

  private extractToken(client: Socket): string | undefined {
    return (
      (client.handshake.auth?.token as string | undefined) ??
      (client.handshake.query?.token as string | undefined) ??
      (client.handshake.headers.authorization?.replace(/^Bearer\s+/i, '') as
        | string
        | undefined)
    );
  }

  private async loadPersonnelProfile(
    userId: string,
    role: string,
  ): Promise<{ name: string; lastname: string } | undefined> {
    try {
      const user = await this.queryBus.execute<GetUserByIdQuery, UserEntity>(
        new GetUserByIdQuery(userId, userId, role as UserRole),
      );
      return { name: user.name, lastname: user.lastname };
    } catch (error) {
      this.logger.warn(
        `Could not load personnel profile for ${userId}: ${(error as Error).message}`,
      );
      return undefined;
    }
  }

  @SubscribeMessage('updateLocation')
  handleUpdateLocation(client: Socket, payload: unknown): void {
    const session = client.data as Partial<RealtimeSocketData>;
    if (session?.role !== 'PERSONAL_SEGURIDAD' || !session.userId) {
      return;
    }

    const coords = parseCoordinates(payload);
    if (!coords) {
      this.logger.warn(`Ignoring invalid updateLocation payload from ${session.userId}`);
      return;
    }

    const identity: { id: string; name?: string; lastname?: string } = {
      id: session.userId,
    };
    if (session.name) {
      identity.name = session.name;
    }
    if (session.lastname) {
      identity.lastname = session.lastname;
    }

    this.server.to(staffRooms()).emit('updateLocation', identity, coords);
  }

  @SubscribeMessage('updatePersonalState')
  handleUpdatePersonalState(client: Socket, payload: unknown): void {
    const session = client.data as Partial<RealtimeSocketData>;
    if (session?.role !== 'PERSONAL_SEGURIDAD' || !session.userId) {
      return;
    }

    const availability = parseAvailability(payload);
    if (!availability) {
      this.logger.warn(`Ignoring invalid updatePersonalState payload from ${session.userId}`);
      return;
    }

    this.server
      .to(staffRooms())
      .emit('updatePersonalState', { id: session.userId, availability });
  }

  emitAlertCreated(alert: AlertEntity): void {
    this.logger.log(`Emitting sendAlert for alert #${alert.id}`);
    this.server.to(staffRooms()).emit('sendAlert', alert);
  }

  emitAlertUpdated(alert: AlertEntity): void {
    this.logger.log(`Emitting updatedAlert for alert #${alert.id}`);
    this.server.to(staffRooms()).emit('updatedAlert', alert);

    if (alert.userId) {
      this.server.to(userRoom(alert.userId)).emit('updatedAlert', alert);
    }

    if (alert.attendedById) {
      this.server.to(userRoom(alert.attendedById)).emit('delegateAlert', alert);
    }
  }

  emitUserDisabled(userId: string): void {
    this.logger.log(`Emitting disableUser for user #${userId}`);
    const room = userRoom(userId);
    this.server.to(room).emit('disableUser', 'Su cuenta ha sido deshabilitada');
    this.server.in(room).disconnectSockets(true);
  }

  emitUserProfileUpdated(user: UserEntity): void {
    this.logger.log(`Emitting updatedProfile for user #${user.id}`);
    this.server.to(userRoom(user.id)).emit('updatedProfile', sanitizeUserForBroadcast(user));
  }

  getActivePersonnel(): string[] {
    return Array.from(this.activePersonnel);
  }
}
