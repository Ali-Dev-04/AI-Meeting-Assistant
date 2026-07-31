import 'reflect-metadata';
import * as Sentry from '@sentry/node';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { corsOrigins, env } from './config/env';

async function bootstrap() {
  if (env.SENTRY_DSN) {
    Sentry.init({ dsn: env.SENTRY_DSN, environment: env.NODE_ENV, tracesSampleRate: 0.1 });
  }
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({ origin: corsOrigins, credentials: true });
  app.setGlobalPrefix('api/v1');

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  // Body validation is done per-route with Zod (shared schemas); no global pipe needed.

  const swaggerConfig = new DocumentBuilder()
    .setTitle('AI Meeting Assistant API')
    .setDescription('REST API for the AI Meeting Assistant.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  await app.listen(env.PORT);

  const logger = new Logger('Bootstrap');
  logger.log(`🚀 API ready on http://localhost:${env.PORT}/api/v1`);
  logger.log(`📘 Swagger at  http://localhost:${env.PORT}/api/docs`);
}

void bootstrap();
