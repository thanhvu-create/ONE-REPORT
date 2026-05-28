import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { ObjectStorage, StoredObject } from './storage.types';

@Injectable()
export class LocalDiskStorage implements ObjectStorage {
  private readonly logger = new Logger(LocalDiskStorage.name);
  private readonly uploadDir: string;

  constructor(config: ConfigService) {
    this.uploadDir = config.get<string>('upload.dir') ?? path.resolve('./uploads/audio');
  }

  async put(file: Express.Multer.File): Promise<StoredObject> {
    await fs.mkdir(this.uploadDir, { recursive: true });
    const ext = guessExt(file);
    const safeName = `${Date.now()}-${randomUUID()}${ext}`;
    const filePath = path.join(this.uploadDir, safeName);
    await fs.writeFile(filePath, file.buffer);
    this.logger.log(`Stored audio file ${safeName} (${file.size} bytes)`);
    return {
      storageKey: filePath,
      driver: 'local',
      fileName: file.originalname || safeName,
      mimeType: file.mimetype || 'application/octet-stream',
      sizeBytes: file.size,
    };
  }

  async getDownloadUrl(): Promise<string | null> {
    // Local files are not served over HTTP in V1. Returning null is fine —
    // the frontend currently does not need to replay audio.
    return null;
  }
}

export function guessExt(file: Express.Multer.File): string {
  const fromName = path.extname(file.originalname || '');
  if (fromName) return fromName.toLowerCase();
  switch (file.mimetype) {
    case 'audio/webm':
      return '.webm';
    case 'audio/ogg':
      return '.ogg';
    case 'audio/mpeg':
    case 'audio/mp3':
      return '.mp3';
    case 'audio/wav':
    case 'audio/x-wav':
      return '.wav';
    case 'audio/mp4':
    case 'audio/m4a':
      return '.m4a';
    default:
      return '.bin';
  }
}
