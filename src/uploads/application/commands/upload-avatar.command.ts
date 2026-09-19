import type { AccessTokenPayload } from '../../../auth/application/commands/sign-in.command.js';
import type { UploadedFile } from '../../domain/storage.service.js';

export class UploadAvatarCommand {
  constructor(
    public readonly userId: string,
    public readonly file: UploadedFile,
    public readonly requestingUser: AccessTokenPayload,
  ) {}
}
