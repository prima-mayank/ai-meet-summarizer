import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  transports: ['websocket', 'polling'],
})
export class MeetingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  
  @WebSocketServer()
  server: Server;

  handleConnection(client: any) {
    console.log('Client connected:', client.id);
  }

  handleDisconnect(client: any) {
    console.log('Client disconnected:', client.id);
  }
  @SubscribeMessage('stream-caption')
  handleCaption(@MessageBody() data: { meetingId: string, text: string }) {
    console.log(`Live from ${data.meetingId}: ${data.text}`);
    
    this.server.emit('live-transcript-update', data);
  }
}
