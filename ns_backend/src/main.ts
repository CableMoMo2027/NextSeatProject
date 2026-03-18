import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: true,
  });
  app.enableCors();
  app.useBodyParser('json', { limit: '25mb' });
  app.useBodyParser('urlencoded', { limit: '25mb', extended: true });

  // Ensure uploads directory exists
  const uploadsDir = join(process.cwd(), 'uploads', 'avatars');
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }

  // Serve uploaded files as static assets
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

