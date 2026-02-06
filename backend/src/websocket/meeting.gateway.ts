import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TranscriptsService } from '../transcripts/transcripts.service';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
  transports: ['websocket', 'polling'],
})
export class MeetingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;
  constructor(private transcriptsService: TranscriptsService) {}

  handleConnection(client: Socket) {
    console.log('Client connected:', client.id);
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected:', client.id);
  }
  @SubscribeMessage('stream-caption')
  handleCaption(
    @MessageBody()
    data: { meetingId: string; text: string; source?: string; title?: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`Live from ${data.meetingId}: ${data.text}`);

    this.transcriptsService.addCaption(data.meetingId, data.text);
    const stats = this.transcriptsService.getStats(data.meetingId);
    client.emit('caption-stored', stats);

    this.server.emit('live-transcript-update', data);
  }

  @SubscribeMessage('get-session-stats')
  handleGetSessionStats(@MessageBody() data: { meetingId: string }) {
    return this.transcriptsService.getStats(data.meetingId);
  }

  @SubscribeMessage('request-summary')
  async handleRequestSummary(
    @MessageBody() data: { meetingId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      console.log(
        `Summary requested: meetingId=${data?.meetingId} client=${client?.id}`,
      );
      const summary = await this.transcriptsService.summarize(data.meetingId);
      const stats = this.transcriptsService.getStats(data.meetingId);
      client.emit('meeting-summary', { ...stats, summary });
      return { ...stats, summary };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to summarize.';
      const stats = this.transcriptsService.getStats(data.meetingId);
      client.emit('meeting-summary', { ...stats, summary: message });
      return { ...stats, summary: message };
    }
  }

  @SubscribeMessage('clear-session')
  handleClearSession(@MessageBody() data: { meetingId: string }) {
    this.transcriptsService.clear(data.meetingId);
    return { meetingId: data.meetingId, cleared: true };
  }
}
