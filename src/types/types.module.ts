import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module.js';
import { CreateTypeHandler } from './application/commands/create-type.handler.js';
import { UpdateTypeHandler } from './application/commands/update-type.handler.js';
import { GetTypeByIdHandler } from './application/queries/get-type-by-id.handler.js';
import { GetTypesHandler } from './application/queries/get-types.handler.js';
import { TYPE_REPOSITORY } from './domain/type.repository.js';
import { MongooseTypeRepository } from './infrastructure/persistence/mongoose-type.repository.js';
import { Type, TypeSchema } from './infrastructure/persistence/type.schema.js';
import { TypesController } from './presentation/types.controller.js';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([{ name: Type.name, schema: TypeSchema }]),
  ],
  controllers: [TypesController],
  providers: [
    CreateTypeHandler,
    UpdateTypeHandler,
    GetTypesHandler,
    GetTypeByIdHandler,
    MongooseTypeRepository,
    {
      provide: TYPE_REPOSITORY,
      useExisting: MongooseTypeRepository,
    },
  ],
  exports: [TYPE_REPOSITORY, MongooseTypeRepository],
})
export class TypesModule {}
