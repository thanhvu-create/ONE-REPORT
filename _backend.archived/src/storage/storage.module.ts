import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalDiskStorage } from './local-storage.service';
import { S3Storage } from './s3-storage.service';
import { OBJECT_STORAGE, ObjectStorage } from './storage.types';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: OBJECT_STORAGE,
      inject: [ConfigService],
      useFactory: (config: ConfigService): ObjectStorage => {
        const driver = (config.get<string>('storage.driver') ?? 'local').toLowerCase();
        const log = new Logger('StorageModule');
        if (driver === 's3') {
          log.log('Using S3 object storage driver');
          return new S3Storage(config);
        }
        log.log('Using local-disk object storage driver');
        return new LocalDiskStorage(config);
      },
    },
  ],
  exports: [OBJECT_STORAGE],
})
export class StorageModule {}
