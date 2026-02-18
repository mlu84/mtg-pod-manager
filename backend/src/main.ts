import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configuredFrontendOrigin = process.env.FRONTEND_URL?.trim();
  const configuredCorsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  const corsOrigins = [
    'http://localhost:4200',
    ...(configuredFrontendOrigin ? [configuredFrontendOrigin] : []),
    ...configuredCorsOrigins,
  ];

  // Enable CORS for frontend (env-driven in production)
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  await app.listen(3000);
}
bootstrap();
