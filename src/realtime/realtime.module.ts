import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { AlertRealtimeHandler } from './application/handlers/alert-realtime.handler.js';
import { UserRealtimeHandler } from './application/handlers/user-realtime.handler.js';
import { RealtimeGateway } from './presentation/gateways/realtime.gateway.js';

@Module({
  imports: [
    CqrsModule,
    ConfigModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') ?? 'default-secret',
      }),
    }),
  ],
  providers: [RealtimeGateway, AlertRealtimeHandler, UserRealtimeHandler],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
