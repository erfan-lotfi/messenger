import {
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Message } from '../../messages/entities/message.entity';
import { ConversationMember } from './conversation-member.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => ConversationMember, (member) => member.conversation, {
    cascade: true,
  })
  members: ConversationMember[];

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];
}
