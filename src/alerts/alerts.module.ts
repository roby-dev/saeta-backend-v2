import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module.js';
import { UsersModule } from '../users/users.module.js';
import { CreateAlertHandler } from './application/commands/create-alert.handler.js';
import { DeletePendingAlertsHandler } from './application/commands/delete-pending-alerts.handler.js';
import { UpdateAlertFeedbackHandler } from './application/commands/update-alert-feedback.handler.js';
import { UpdateAlertHandler } from './application/commands/update-alert.handler.js';
import { GetAlertByIdHandler } from './application/queries/get-alert-by-id.handler.js';
import { GetAlertsByAttendedUserHandler } from './application/queries/get-alerts-by-attended-user.handler.js';
import { GetAlertsByUserHandler } from './application/queries/get-alerts-by-user.handler.js';
import { GetAlertsHandler } from './application/queries/get-alerts.handler.js';
import { ALERT_REPOSITORY } from './domain/alert.repository.js';
import { State, StateSchema } from './infrastructure/persistence/alert-state.schema.js';
import { Type, TypeSchema } from './infrastructure/persistence/alert-type.schema.js';
import { Alert, AlertSchema } from './infrastructure/persistence/alert.schema.js';
import { MongooseAlertRepository } from './infrastructure/persistence/mongoose-alert.repository.js';
import { AlertsController } from './presentation/alerts.controller.js';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    MongooseModule.forFeature([
      { name: Alert.name, schema: AlertSchema },
      { name: State.name, schema: StateSchema },
      { name: Type.name, schema: TypeSchema },
    ]),
  ],
  controllers: [AlertsController],
  providers: [
    CreateAlertHandler,
    UpdateAlertHandler,
    UpdateAlertFeedbackHandler,
    DeletePendingAlertsHandler,
    GetAlertsHandler,
    GetAlertByIdHandler,
    GetAlertsByUserHandler,
    GetAlertsByAttendedUserHandler,
    MongooseAlertRepository,
    {
      provide: ALERT_REPOSITORY,
      useExisting: MongooseAlertRepository,
    },
  ],
  exports: [ALERT_REPOSITORY, MongooseAlertRepository],
})
export class AlertsModule {}
