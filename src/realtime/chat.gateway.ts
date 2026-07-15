import {
  ConnectedSocket,
  OnGatewayInit,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Server, Socket } from 'socket.io';
import { Repository } from 'typeorm';
import { Conversation } from '../conversations/entities/conversation.entity';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';
import { Message } from '../messages/entities/message.entity';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(Conversation)
    private readonly conversationsRepository: Repository<Conversation>,
  ) {}

  @WebSocketServer()
  server: Server;

  afterInit() {
    this.server.use(async (socket, next) => {
      try {
        const token = this.extractToken(socket);

        if (!token) {
          throw new UnauthorizedException('Missing socket token.');
        }

        socket.data.user =
          await this.jwtService.verifyAsync<AuthenticatedUser>(token);
        next();
      } catch {
        next(new Error('Unauthorized'));
      }
    });
  }

  handleConnection(client: Socket) {
    client.emit('chat:connected', {
      message: 'Socket connection established.',
      socketId: client.id,
    });
  }

  handleDisconnect(client: Socket) {
    client.emit('chat:disconnected', {
      message: 'Socket connection closed.',
      socketId: client.id,
    });
  }

  @SubscribeMessage('chat:join')
  async joinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: number },
  ) {
    const user = client.data.user as AuthenticatedUser | undefined;

    if (!user) {
      client.emit('chat:error', { message: 'Unauthorized socket.' });
      return;
    }

    const conversation = await this.conversationsRepository.findOne({
      where: { id: payload.conversationId },
      relations: {
        members: {
          user: true,
        },
      },
    });

    const isMember = conversation?.members.some(
      (member) => member.user.id === user.sub,
    );

    if (!conversation || !isMember) {
      client.emit('chat:error', { message: 'Conversation access denied.' });
      return;
    }

    for (const room of client.rooms) {
      if (room !== client.id) {
        await client.leave(room);
      }
    }

    const roomName = this.getConversationRoom(payload.conversationId);

    await client.join(roomName);

    client.emit('chat:joined', {
      conversationId: payload.conversationId,
      roomName,
    });
  }

  emitMessage(message: Message) {
    this.server
      .to(this.getConversationRoom(message.conversation.id))
      .emit('message:new', message);
  }

  private getConversationRoom(conversationId: number) {
    return `conversation:${conversationId}`;
  }

  private extractToken(socket: Socket) {
    const authToken =
      typeof socket.handshake.auth?.token === 'string'
        ? socket.handshake.auth.token
        : null;

    if (authToken) {
      return authToken;
    }

    const header = socket.handshake.headers.authorization;

    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice(7);
    }

    return null;
  }
}
