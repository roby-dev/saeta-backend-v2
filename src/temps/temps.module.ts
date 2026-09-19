import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module.js';
import { UsersModule } from '../users/users.module.js';
import { CreateTempHandler } from './application/commands/create-temp.handler.js';
import { DeleteTempHandler } from './application/commands/delete-temp.handler.js';
import { GetTempByIdHandler } from './application/queries/get-temp-by-id.handler.js';
import { GetTempByUserHandler } from './application/queries/get-temp-by-user.handler.js';
import { GetTempsHandler } from './application/queries/get-temps.handler.js';
import { TEMP_REPOSITORY } from './domain/temp.repository.js';
import { MongooseTempRepository } from './infrastructure/persistence/mongoose-temp.repository.js';
import { Temp, TempSchema } from './infrastructure/persistence/temp.schema.js';
import { TempsController } from './presentation/temps.controller.js';

@Module({
  imports: [
    CqrsModule,
    AuthModule,
    UsersModule,
    MongooseModule.forFeature([{ name: Temp.name, schema: TempSchema }]),
  ],
  controllers: [TempsController],
  providers: [
    CreateTempHandler,
    DeleteTempHandler,
    GetTempsHandler,
    GetTempByUserHandler,
    GetTempByIdHandler,
    MongooseTempRepository,
    {
      provide: TEMP_REPOSITORY,
      useExisting: MongooseTempRepository,
    },
  ],
  exports: [TEMP_REPOSITORY, MongooseTempRepository],
})
export class TempsModule {}
