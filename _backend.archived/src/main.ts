import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  const config = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableCors({
    origin: config.get<string>('corsOrigin')?.split(',').map((o) => o.trim()) ?? true,
    credentials: true,
  });

  const port = config.get<number>('port') ?? 4000;
  await app.listen(port, '0.0.0.0');

  // Bootstrap log goes through pino now.
  app.get(Logger).log(`One Report API listening on http://0.0.0.0:${port}/api/v1`, 'Bootstrap');
}

bootstrap();
