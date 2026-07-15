import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Conversation } from '../../conversations/entities/conversation.entity';
import { Attachment } from '../../uploads/entities/attachment.entity';
import { User } from '../../users/entities/user.entity';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
}

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  type: MessageType;

  @Column({ type: 'text', nullable: true })
  text: string | null;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @ManyToOne(() => User, (user) => user.sentMessages, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @OneToOne(() => Attachment, (attachment) => attachment.message, {
    nullable: true,
    cascade: true,
    eager: true,
  })
  attachment?: Attachment | null;

  @CreateDateColumn()
  createdAt: Date;
}
