import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from '../conversations/entities/conversation.entity';
import { RealtimeModule } from '../realtime/realtime.module';
import { Attachment } from '../uploads/entities/attachment.entity';
import { User } from '../users/entities/user.entity';
import { MessagesController } from './messages.controller';
import { Message } from './entities/message.entity';
import { MessagesService } from './messages.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, Attachment, Conversation, User]),
    RealtimeModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
