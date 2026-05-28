import { Inject, Injectable } from '@nestjs/common';
import { OBJECT_STORAGE, ObjectStorage, StoredObject } from '../storage/storage.types';

@Injectable()
export class VoiceService {
  constructor(@Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage) {}

  saveFromMulter(file: Express.Multer.File): Promise<StoredObject> {
    return this.storage.put(file);
  }

  /**
   * Pre-signed (or local) URL the frontend could later use to replay audio.
   * Local driver returns null; S3 driver returns a short-lived URL.
   */
  getDownloadUrl(storageKey: string): Promise<string | null> {
    return this.storage.getDownloadUrl?.(storageKey) ?? Promise.resolve(null);
  }
}
