export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  destination?: string;
  filename?: string;
  path?: string;
}

export interface UploadResult {
  fileId: string;
  filename: string;
  path?: string;
  mimeType: string;
  size: number;
}

export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');

export interface StorageService {
  upload(file: UploadedFile): Promise<UploadResult>;
  delete(fileId: string): Promise<void>;
  getFilePath(fileId: string): string | null;
}
