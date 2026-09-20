import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module.js';
import { ChangePasswordHandler } from './application/commands/change-password.handler.js';
import { CreateUserHandler } from './application/commands/create-user.handler.js';
import { UpdateUserHandler } from './application/commands/update-user.handler.js';
import { VerifyPasswordHandler } from './application/commands/verify-password.handler.js';
import { GetSecurityPersonnelHandler } from './application/queries/get-security-personnel.handler.js';
import { GetUserByIdHandler } from './application/queries/get-user-by-id.handler.js';
import { GetUsersHandler } from './application/queries/get-users.handler.js';
import { LookupDniHandler } from './application/queries/lookup-dni.handler.js';
import { USER_REPOSITORY } from './domain/user.repository.js';
import { MongooseUserRepository } from './infrastructure/persistence/mongoose-user.repository.js';
import { User, UserSchema } from './infrastructure/persistence/user.schema.js';
import { UsersController } from './presentation/users.controller.js';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [UsersController],
  providers: [
    CreateUserHandler,
    UpdateUserHandler,
    ChangePasswordHandler,
    VerifyPasswordHandler,
    GetUsersHandler,
    GetUserByIdHandler,
    GetSecurityPersonnelHandler,
    LookupDniHandler,
    MongooseUserRepository,
    {
      provide: USER_REPOSITORY,
      useExisting: MongooseUserRepository,
    },
  ],
  exports: [USER_REPOSITORY, MongooseUserRepository],
})
export class UsersModule {}
