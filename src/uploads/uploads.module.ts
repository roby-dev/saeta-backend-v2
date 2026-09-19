import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from '../auth/auth.module.js';
import { UsersModule } from '../users/users.module.js';
import { UploadAvatarHandler } from './application/commands/upload-avatar.handler.js';
import { STORAGE_SERVICE } from './domain/storage.service.js';
import { LocalStorageService } from './infrastructure/local-storage.service.js';
import { UploadsController } from './presentation/uploads.controller.js';

@Module({
  imports: [CqrsModule, AuthModule, UsersModule],
  controllers: [UploadsController],
  providers: [
    UploadAvatarHandler,
    LocalStorageService,
    {
      provide: STORAGE_SERVICE,
      useExisting: LocalStorageService,
    },
  ],
  exports: [STORAGE_SERVICE, LocalStorageService],
})
export class UploadsModule {}
