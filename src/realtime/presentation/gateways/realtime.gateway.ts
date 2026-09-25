import { Logger } from '@nestjs/common';
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

export interface ConnectedUserSession {
  socketId: string;
  userId: string;
  role?: string;
}

interface RealtimeSocketData {
  userId: string;
  role?: string;
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

  constructor(private readonly jwtService: JwtService) {}

  afterInit(_server: Server): void {
    this.logger.log('RealtimeGateway initialized - WebSockets listening');
  }

  handleConnection(client: Socket): void {
    const session = this.authenticate(client);

    if (!session) {
      this.logger.warn(`Rejecting unauthenticated connection [id=${client.id}]`);
      client.disconnect(true);
      return;
    }

    const data: RealtimeSocketData = { userId: session.userId, role: session.role };
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

  @SubscribeMessage('updateLocation')
  handleUpdateLocation(client: Socket, payload: unknown): void {
    // Supports legacy: (user, latLng) or object payload { user, latLng }
    if (Array.isArray(payload)) {
      const [user, latLng] = payload;
      client.broadcast.emit('updateLocation', user, latLng);
    } else if (typeof payload === 'object' && payload !== null && 'user' in payload) {
      const p = payload as { user: unknown; latLng?: unknown; location?: unknown };
      const coords = p.latLng ?? p.location;
      client.broadcast.emit('updateLocation', p.user, coords);
    } else {
      client.broadcast.emit('updateLocation', payload);
    }
  }

  @SubscribeMessage('updatePersonalState')
  handleUpdatePersonalState(client: Socket, payload: unknown): void {
    client.broadcast.emit('updatePersonalState', payload);
  }

  @SubscribeMessage('updatedAlert')
  handleClientUpdatedAlert(client: Socket, payload: unknown): void {
    client.broadcast.emit('updatedAlert', payload);
  }

  emitAlertCreated(alert: AlertEntity): void {
    this.logger.log(`Emitting sendAlert for alert #${alert.id}`);
    this.server.emit('sendAlert', alert);
  }

  emitAlertUpdated(alert: AlertEntity): void {
    this.logger.log(`Emitting updatedAlert for alert #${alert.id}`);
    this.server.emit('updatedAlert', alert);

    if (alert.userId) {
      this.server.emit(`updatedAlert-${alert.userId}`, alert);
    }

    if (alert.attendedById) {
      this.server.emit(`delegateAlert-${alert.attendedById}`, alert);
    }
  }

  emitUserDisabled(userId: string): void {
    this.logger.log(`Emitting disableUser for user #${userId}`);
    this.server.emit(`disableUser-${userId}`, 'Su cuenta ha sido deshabilitada');
  }

  getActivePersonnel(): string[] {
    return Array.from(this.activePersonnel);
  }
}
