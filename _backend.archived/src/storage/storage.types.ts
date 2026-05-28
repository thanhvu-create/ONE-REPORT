export const OBJECT_STORAGE = Symbol('ObjectStorage');

export interface StoredObject {
  /** Driver-specific identifier (filesystem path for local, "key" for S3). */
  storageKey: string;
  /** Driver tag echoed back so callers know where the object lives. */
  driver: 'local' | 's3';
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface ObjectStorage {
  /** Persist a Multer-uploaded file and return the storage identifier. */
  put(file: Express.Multer.File): Promise<StoredObject>;
  /** Optional: pre-signed or direct URL to download. Used by future "play voice" UI. */
  getDownloadUrl?(storageKey: string, expiresSeconds?: number): Promise<string | null>;
}
