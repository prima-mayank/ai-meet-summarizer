import { DynamicModule, Module, Type } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MeetingGateway } from './websocket/meeting.gateway';
import { TranscriptsService } from './transcripts/transcripts.service';
import { ExportController } from './export/export.controller';
import { HealthController } from './health/health.controller';
const appImports: Array<DynamicModule | Type<any> | Promise<DynamicModule>> = [
  ConfigModule.forRoot({
    isGlobal: true,
  }),
];
@Module({
  imports: appImports,
  controllers: [AppController, ExportController, HealthController],
  providers: [AppService, MeetingGateway, TranscriptsService],
})
export class AppModule {}
