import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import configuration from './config/configuration';
import { loggerConfig } from './common/logging/logger.config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DepartmentsModule } from './departments/departments.module';
import { ReportsModule } from './reports/reports.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DepartmentDirectionsModule } from './department-directions/department-directions.module';
import { AiModule } from './ai/ai.module';
import { VoiceModule } from './voice/voice.module';
import { StorageModule } from './storage/storage.module';
import { RemindersModule } from './reminders/reminders.module';
import { PositionsModule } from './positions/positions.module';
import { TasksModule } from './tasks/tasks.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, load: [configuration] }),
    ScheduleModule.forRoot(),
    LoggerModule.forRoot(loggerConfig),
    PrismaModule,
    AuthModule,
    UsersModule,
    DepartmentsModule,
    StorageModule,
    AiModule,
    VoiceModule,
    ReportsModule,
    DashboardModule,
    DepartmentDirectionsModule,
    PositionsModule,
    TasksModule,
    RemindersModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
