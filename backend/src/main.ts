import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const corsOrigin = config.get<string>('CORS_ORIGIN') || '*';
  app.enableCors({ origin: corsOrigin, methods: '*', credentials: false });

  const rawPort = config.get<string>('PORT') ?? '3001';
  const port = Number(rawPort) || 3001;
  await app.listen(port);
  console.log(`Backend listening on http://localhost:${port}`);
}
bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
