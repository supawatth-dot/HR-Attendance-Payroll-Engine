import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const apiPrefix = 'api/v1';
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.setGlobalPrefix(apiPrefix);

  // Keep an unprefixed health endpoint for Docker and local smoke tests.
  const server = app.getHttpAdapter().getInstance();
  server.get('/health', (_req: any, res: any) => {
    res.status(200).json({ status: 'ok', apiPrefix: `/${apiPrefix}` });
  });

  const port = Number(process.env.PORT || 3000);
  await app.listen(port);
  console.log(`Backend listening on http://localhost:${port}/${apiPrefix}`);
}
bootstrap();
