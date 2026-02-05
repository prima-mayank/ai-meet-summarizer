import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { TranscriptsService } from '../transcripts/transcripts.service';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
  transports: ['websocket', 'polling'],
})
export class MeetingGateway implements OnGatewayConnection, OnGatewayDisconnect {

  @WebSocketServer()
  server: Server;
  constructor(private transcriptsService: TranscriptsService) {}

  handleConnection(client: any) {
    console.log('Client connected:', client.id);
  }

  handleDisconnect(client: any) {
    console.log('Client disconnected:', client.id);
  }
  @SubscribeMessage('stream-caption')
  handleCaption(@MessageBody() data: { meetingId: string; text: string; source?: string; title?: string }) {
    console.log(`Live from ${data.meetingId}: ${data.text}`);

    this.transcriptsService.addCaption(data.meetingId, data.text);

    this.server.emit('live-transcript-update', data);
  }

  @SubscribeMessage('request-summary')
  async handleRequestSummary(@MessageBody() data: { meetingId: string }) {
    const summary = await this.transcriptsService.summarize(data.meetingId);
    this.server.emit('meeting-summary', { meetingId: data.meetingId, summary });
    return { meetingId: data.meetingId, summary };
  }

  @SubscribeMessage('clear-session')
  handleClearSession(@MessageBody() data: { meetingId: string }) {
    this.transcriptsService.clear(data.meetingId);
    return { meetingId: data.meetingId, cleared: true };
  }
}
