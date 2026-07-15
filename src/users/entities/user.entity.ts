import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ConversationMember } from '../../conversations/entities/conversation-member.entity';
import { Message } from '../../messages/entities/message.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column({ select: false })
  passwordHash: string;

  @Column({ type: 'text', nullable: true, select: false })
  refreshTokenHash: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => ConversationMember, (member) => member.user)
  conversationMemberships: ConversationMember[];

  @OneToMany(() => Message, (message) => message.sender)
  sentMessages: Message[];
}
