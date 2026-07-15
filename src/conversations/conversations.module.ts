import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { ConversationMember } from './entities/conversation-member.entity';
import { Conversation } from './entities/conversation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, ConversationMember]),
    UsersModule,
  ],
  controllers: [ConversationsController],
  providers: [ConversationsService],
})
export class ConversationsModule {}
