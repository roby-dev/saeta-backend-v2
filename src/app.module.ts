import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module.js';
import { validateEnvironment } from './config/environment.validation.js';
import { AppController } from './app.controller.js';
import { AlertsModule } from './alerts/alerts.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { RealtimeModule } from './realtime/realtime.module.js';
import { StatesModule } from './states/states.module.js';
import { TelemetryModule } from './telemetry/telemetry.module.js';
import { TempsModule } from './temps/temps.module.js';
import { TypesModule } from './types/types.module.js';
import { UploadsModule } from './uploads/uploads.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
      }),
    }),
    CqrsModule.forRoot(),
    TelemetryModule,
    AuthModule,
    UsersModule,
    AlertsModule,
    StatesModule,
    TypesModule,
    TempsModule,
    UploadsModule,
    DashboardModule,
    RealtimeModule,
  ],
})
export class AppModule {}
