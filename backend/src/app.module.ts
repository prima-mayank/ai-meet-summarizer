import { DynamicModule, Module, Type } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MeetingsModule } from './meetings/meetings.module';
import { MeetingGateway } from './websocket/meeting.gateway';
import { TranscriptsService } from './transcripts/transcripts.service';
import { ExportController } from './export/export.controller';
import { HealthController } from './health/health.controller';
import * as dotenv from 'dotenv';

dotenv.config();
const mongoUri = process.env.MONGO_URI;
const appImports: Array<DynamicModule | Type<any> | Promise<DynamicModule>> = [
  ConfigModule.forRoot({
    isGlobal: true,
  }),
];

if (mongoUri) {
  appImports.push(MongooseModule.forRoot(mongoUri));
  appImports.push(MeetingsModule);
} else {
  console.warn('MONGO_URI not set. MeetingsModule is disabled.');
}
@Module({
  imports: appImports,
  controllers: [AppController, ExportController, HealthController],
  providers: [AppService, MeetingGateway, TranscriptsService],
})
export class AppModule {}
