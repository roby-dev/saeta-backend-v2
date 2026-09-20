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

export interface ConnectedUserSession {
  socketId: string;
  userId: string;
  role?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
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
    const rawToken =
      (client.handshake.auth?.token as string | undefined) ??
      (client.handshake.query?.token as string | undefined) ??
      (client.handshake.headers.authorization?.replace(/^Bearer\s+/i, '') as
        | string
        | undefined);

    let userId: string | undefined;
    let role: string | undefined;

    if (rawToken) {
      try {
        const payload = this.jwtService.verify<{ sub: string; role?: string }>(rawToken);
        userId = payload.sub;
        role = payload.role;
      } catch {
        // Token verification failed; fall back to query id if provided (legacy support)
      }
    }

    if (!userId && client.handshake.query?.id) {
      userId = String(client.handshake.query.id);
    }

    if (userId) {
      this.connectedUsers.set(client.id, { socketId: client.id, userId, role });

      // If personal de seguridad connects (or legacy query.id was supplied)
      if (role === 'PERSONAL_SEGURIDAD' || client.handshake.query?.id) {
        this.activePersonnel.add(userId);
        this.logger.log(`Personal connected: ${userId}`);
        client.broadcast.emit('personalConnected', userId);
      }
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
        this.server.emit('personalDisconnected', session.userId);
      }
    }

    this.logger.log(`Client disconnected [id=${client.id}]`);
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
