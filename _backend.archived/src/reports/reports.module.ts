import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { AiModule } from '../ai/ai.module';
import { VoiceModule } from '../voice/voice.module';

@Module({
  imports: [AiModule, VoiceModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
