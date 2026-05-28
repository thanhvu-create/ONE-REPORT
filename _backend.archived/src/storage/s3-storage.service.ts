import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { ObjectStorage, StoredObject } from './storage.types';
import { guessExt } from './local-storage.service';

@Injectable()
export class S3Storage implements ObjectStorage {
  private readonly logger = new Logger(S3Storage.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly prefix: string;

  constructor(config: ConfigService) {
    const region = config.get<string>('storage.s3.region') ?? 'us-east-1';
    const endpoint = config.get<string>('storage.s3.endpoint') || undefined;
    const accessKeyId = config.get<string>('storage.s3.accessKeyId');
    const secretAccessKey = config.get<string>('storage.s3.secretAccessKey');
    this.bucket = config.get<string>('storage.s3.bucket') ?? 'one-report';
    this.prefix = (config.get<string>('storage.s3.prefix') ?? 'audio').replace(/^\/+|\/+$/g, '');
    const forcePathStyle = config.get<boolean>('storage.s3.forcePathStyle') ?? Boolean(endpoint);

    this.client = new S3Client({
      region,
      endpoint,
      forcePathStyle,
      credentials:
        accessKeyId && secretAccessKey
          ? { accessKeyId, secretAccessKey }
          : undefined,
    });
    this.logger.log(`S3 storage ready — bucket=${this.bucket} prefix=${this.prefix} endpoint=${endpoint ?? 'aws-default'}`);
  }

  async put(file: Express.Multer.File): Promise<StoredObject> {
    const ext = guessExt(file);
    const key = `${this.prefix}/${Date.now()}-${randomUUID()}${ext}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype || 'application/octet-stream',
        Metadata: {
          'original-name': encodeURIComponent(file.originalname || ''),
        },
      }),
    );
    this.logger.log(`Uploaded ${key} (${file.size} bytes) to S3`);
    return {
      storageKey: key,
      driver: 's3',
      fileName: file.originalname || key,
      mimeType: file.mimetype || 'application/octet-stream',
      sizeBytes: file.size,
    };
  }

  async getDownloadUrl(storageKey: string, expiresSeconds = 600): Promise<string> {
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: storageKey });
    return getSignedUrl(this.client, cmd, { expiresIn: expiresSeconds });
  }
}
