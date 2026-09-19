import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';
import { RefreshTokenHandler } from './application/commands/refresh-token.handler.js';
import { SignInHandler } from './application/commands/sign-in.handler.js';
import { GetCurrentUserHandler } from './application/queries/get-current-user.handler.js';
import { AUTH_USER_REPOSITORY } from './domain/auth-user.repository.js';
import { MongooseAuthUserRepository } from './infrastructure/persistence/mongoose-auth-user.repository.js';
import { User, UserSchema } from './infrastructure/persistence/user.schema.js';
import { AuthController } from './presentation/auth.controller.js';
import { JwtAuthGuard } from './presentation/jwt-auth.guard.js';
import { JwtStrategy } from './presentation/jwt.strategy.js';
import { RolesGuard } from './presentation/roles.guard.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.getOrThrow<string>('JWT_EXPIRES_IN') as StringValue,
        },
      }),
    }),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [AuthController],
  providers: [
    SignInHandler,
    RefreshTokenHandler,
    GetCurrentUserHandler,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    MongooseAuthUserRepository,
    {
      provide: AUTH_USER_REPOSITORY,
      useExisting: MongooseAuthUserRepository,
    },
  ],
  exports: [PassportModule, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
