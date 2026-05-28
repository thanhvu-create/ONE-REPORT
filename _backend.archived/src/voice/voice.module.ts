import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { VoiceService } from './voice.service';

@Module({
  imports: [StorageModule],
  providers: [VoiceService],
  exports: [VoiceService],
})
export class VoiceModule {}
