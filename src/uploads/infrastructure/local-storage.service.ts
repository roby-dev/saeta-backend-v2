import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  StorageService,
  UploadedFile,
  UploadResult,
} from '../domain/storage.service.js';

@Injectable()
export class LocalStorageService implements StorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly uploadDir: string;

  constructor() {
    this.uploadDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(file: UploadedFile): Promise<UploadResult> {
    const originalName = file.originalname ?? 'image.jpg';
    const ext = path.extname(originalName).replace('.', '') || 'jpg';
    const filename = `${randomUUID()}.${ext}`;
    const filePath = path.join(this.uploadDir, filename);

    await fs.promises.writeFile(filePath, file.buffer);

    return {
      fileId: filename,
      filename,
      path: filePath,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  async delete(fileId: string): Promise<void> {
    const safeFilename = path.basename(fileId);
    const filePath = path.join(this.uploadDir, safeFilename);

    if (fs.existsSync(filePath)) {
      try {
        await fs.promises.unlink(filePath);
      } catch (error) {
        this.logger.warn(`Failed to delete local file ${filePath}: ${String(error)}`);
      }
    }
  }

  getFilePath(fileId: string): string | null {
    const safeFilename = path.basename(fileId);
    const filePath = path.join(this.uploadDir, safeFilename);

    return fs.existsSync(filePath) ? filePath : null;
  }
}
