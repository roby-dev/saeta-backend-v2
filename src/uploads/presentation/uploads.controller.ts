import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Param,
  Put,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import type { AccessTokenPayload } from '../../auth/application/commands/sign-in.command.js';
import { CurrentUser } from '../../auth/presentation/current-user.decorator.js';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard.js';
import type { UserEntity } from '../../users/domain/user.entity.js';
import { UploadAvatarCommand } from '../application/commands/upload-avatar.command.js';
import {
  STORAGE_SERVICE,
  type StorageService,
  type UploadedFile as UploadedFileType,
} from '../domain/storage.service.js';

const DEFAULT_IMAGE_URL =
  'https://drive.google.com/uc?export=view&id=1VFKZoLiXvEF3qooLQA_rPSrovZeZEQZg';

@Controller('v1/uploads')
export class UploadsController {
  constructor(
    private readonly commandBus: CommandBus,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: StorageService,
  ) {}

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
    }),
  )
  async uploadAvatar(
    @Param('id') id: string,
    @UploadedFile() file: UploadedFileType,
    @CurrentUser() currentUser: AccessTokenPayload,
  ): Promise<{ ok: boolean; user: UserEntity }> {
    if (!file) {
      throw new BadRequestException('No image file was provided');
    }

    const user: UserEntity = await this.commandBus.execute(
      new UploadAvatarCommand(id, file, currentUser),
    );

    return { ok: true, user };
  }

  @Get(':photo')
  returnImage(@Param('photo') photo: string, @Res() res: Response): void {
    if (photo === 'no-image') {
      res.redirect(DEFAULT_IMAGE_URL);
      return;
    }

    const localPath = this.storageService.getFilePath(photo);
    if (localPath) {
      res.sendFile(localPath);
      return;
    }

    res.redirect(`https://drive.google.com/uc?export=view&id=${photo}`);
  }
}
