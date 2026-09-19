import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module.js';
import { CreateStateHandler } from './application/commands/create-state.handler.js';
import { UpdateStateHandler } from './application/commands/update-state.handler.js';
import { GetStateByIdHandler } from './application/queries/get-state-by-id.handler.js';
import { GetStatesHandler } from './application/queries/get-states.handler.js';
import { STATE_REPOSITORY } from './domain/state.repository.js';
import { MongooseStateRepository } from './infrastructure/persistence/mongoose-state.repository.js';
import { State, StateSchema } from './infrastructure/persistence/state.schema.js';
import { StatesController } from './presentation/states.controller.js';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([{ name: State.name, schema: StateSchema }]),
  ],
  controllers: [StatesController],
  providers: [
    CreateStateHandler,
    UpdateStateHandler,
    GetStatesHandler,
    GetStateByIdHandler,
    MongooseStateRepository,
    {
      provide: STATE_REPOSITORY,
      useExisting: MongooseStateRepository,
    },
  ],
  exports: [STATE_REPOSITORY, MongooseStateRepository],
})
export class StatesModule {}
