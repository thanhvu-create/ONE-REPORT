import * as path from 'path';

export type StorageDriver = 'local' | 's3';

export interface AppConfig {
  port: number;
  nodeEnv: string;
  corsOrigin: string;
  jwt: {
    secret: string;
    expiresIn: string;
  };
  gemini: {
    apiKey: string;
    chatModel: string;
  };
  upload: {
    dir: string;
    maxMb: number;
  };
  storage: {
    driver: StorageDriver;
    s3: {
      region: string;
      bucket: string;
      prefix: string;
      endpoint: string | undefined;
      forcePathStyle: boolean;
      accessKeyId: string | undefined;
      secretAccessKey: string | undefined;
    };
  };
}

function asBool(v: string | undefined, def: boolean): boolean {
  if (v === undefined) return def;
  return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
}

const DEV_CORS_ORIGINS = 'http://localhost:3000,http://127.0.0.1:3000';

export default (): AppConfig => ({
  port: parseInt(process.env.PORT ?? '4000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigin:
    process.env.CORS_ORIGIN ??
    ((process.env.NODE_ENV ?? 'development') === 'production'
      ? 'http://localhost:3000'
      : DEV_CORS_ORIGINS),
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-only-secret-do-not-use-in-prod',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '24h',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? '',
    chatModel: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash',
  },
  upload: {
    dir: path.resolve(process.env.UPLOAD_DIR ?? './uploads/audio'),
    maxMb: parseInt(process.env.MAX_UPLOAD_MB ?? '25', 10),
  },
  storage: {
    driver: (process.env.STORAGE_DRIVER as StorageDriver) || 'local',
    s3: {
      region: process.env.S3_REGION ?? 'us-east-1',
      bucket: process.env.S3_BUCKET ?? 'one-report',
      prefix: process.env.S3_PREFIX ?? 'audio',
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: asBool(process.env.S3_FORCE_PATH_STYLE, Boolean(process.env.S3_ENDPOINT)),
      accessKeyId: process.env.S3_ACCESS_KEY_ID || undefined,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || undefined,
    },
  },
});
