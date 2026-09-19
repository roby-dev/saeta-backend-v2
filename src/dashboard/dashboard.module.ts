import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { Alert, AlertSchema } from '../alerts/infrastructure/persistence/alert.schema.js';
import { AuthModule } from '../auth/auth.module.js';
import { State, StateSchema } from '../states/infrastructure/persistence/state.schema.js';
import { Type, TypeSchema } from '../types/infrastructure/persistence/type.schema.js';
import { User, UserSchema } from '../users/infrastructure/persistence/user.schema.js';
import { GetDashboardOverviewHandler } from './application/queries/get-dashboard-overview.handler.js';
import { DashboardController } from './presentation/dashboard.controller.js';

@Module({
  imports: [
    CqrsModule,
    AuthModule,
    MongooseModule.forFeature([
      { name: Alert.name, schema: AlertSchema },
      { name: User.name, schema: UserSchema },
      { name: State.name, schema: StateSchema },
      { name: Type.name, schema: TypeSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [GetDashboardOverviewHandler],
  exports: [GetDashboardOverviewHandler],
})
export class DashboardModule {}
