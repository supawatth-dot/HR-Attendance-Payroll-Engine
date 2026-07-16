import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Backend listening on http://localhost:${port}`);
}
bootstrap();
