import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { static as expressStatic } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const httpsKeyPath = process.env.HTTPS_KEY_PATH;
  const httpsCertPath = process.env.HTTPS_CERT_PATH;
  const httpsEnabled = Boolean(httpsKeyPath && httpsCertPath);
  const httpsOptions =
    httpsEnabled && httpsKeyPath && httpsCertPath
      ? {
          key: readFileSync(join(process.cwd(), httpsKeyPath)),
          cert: readFileSync(join(process.cwd(), httpsCertPath)),
        }
      : undefined;

  const app = await NestFactory.create(AppModule, {
    httpsOptions,
  });
  const uploadDir = process.env.UPLOAD_DIR || 'uploads';
  const absoluteUploadDir = join(process.cwd(), uploadDir);

  if (!existsSync(absoluteUploadDir)) {
    mkdirSync(absoluteUploadDir, { recursive: true });
  }

  app.enableCors();
  app.use(`/${uploadDir}`, expressStatic(absoluteUploadDir));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  const port = process.env.PORT ?? 3000;

  await app.listen(port);

  const protocol = httpsOptions ? 'https' : 'http';
  console.log(`Messenger API running on ${protocol}://localhost:${port}`);
}
bootstrap();
