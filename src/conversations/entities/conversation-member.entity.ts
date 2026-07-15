import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Conversation } from './conversation.entity';

@Entity('conversation_members')
@Unique(['conversation', 'user'])
export class ConversationMember {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Conversation, (conversation) => conversation.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @ManyToOne(() => User, (user) => user.conversationMemberships, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  joinedAt: Date;
}
