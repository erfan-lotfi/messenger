import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from '../conversations/entities/conversation.entity';
import { ChatGateway } from '../realtime/chat.gateway';
import { EncryptionService } from '../security/encryption.service';
import { Attachment } from '../uploads/entities/attachment.entity';
import { User } from '../users/entities/user.entity';
import {
  CreateMediaMessageDto,
  CreateMessageDto,
} from './dto/create-message.dto';
import { Message, MessageType } from './entities/message.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messagesRepository: Repository<Message>,
    @InjectRepository(Attachment)
    private readonly attachmentsRepository: Repository<Attachment>,
    @InjectRepository(Conversation)
    private readonly conversationsRepository: Repository<Conversation>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly chatGateway: ChatGateway,
    private readonly encryptionService: EncryptionService,
  ) {}

  async create(
    createMessageDto: CreateMessageDto,
    senderId: number,
  ): Promise<Message> {
    const { conversation, sender } = await this.validateMessageParticipants(
      createMessageDto.conversationId,
      senderId,
    );

    const message = this.messagesRepository.create({
      type: MessageType.TEXT,
      text: this.encryptionService.encryptText(createMessageDto.text),
      conversation,
      sender,
    });

    const savedMessage = await this.messagesRepository.save(message);
    const hydratedMessage = this.hydrateMessage(savedMessage);

    this.chatGateway.emitMessage(hydratedMessage);

    return hydratedMessage;
  }

  async createMediaMessage(
    createMediaMessageDto: CreateMediaMessageDto,
    senderId: number,
    file: {
      originalName: string;
      fileName: string;
      mimeType: string;
      size: number;
      relativePath: string;
      publicUrl: string;
      type: MessageType.IMAGE | MessageType.VIDEO;
    },
  ): Promise<Message> {
    const { conversation, sender } = await this.validateMessageParticipants(
      createMediaMessageDto.conversationId,
      senderId,
    );

    const message = this.messagesRepository.create({
      type: file.type,
      text: createMediaMessageDto.text?.trim()
        ? this.encryptionService.encryptText(createMediaMessageDto.text.trim())
        : null,
      conversation,
      sender,
    });

    const savedMessage = await this.messagesRepository.save(message);

    const attachment = this.attachmentsRepository.create({
      originalName: file.originalName,
      fileName: file.fileName,
      mimeType: file.mimeType,
      size: file.size,
      relativePath: file.relativePath,
      publicUrl: file.publicUrl,
      message: savedMessage,
    });

    savedMessage.attachment = await this.attachmentsRepository.save(attachment);
    const hydratedMessage = this.hydrateMessage(savedMessage);

    this.chatGateway.emitMessage(hydratedMessage);

    return hydratedMessage;
  }

  async findForConversation(
    conversationId: number,
    userId: number,
  ): Promise<Message[]> {
    await this.validateMessageParticipants(conversationId, userId);

    const messages = await this.messagesRepository.find({
      where: {
        conversation: {
          id: conversationId,
        },
      },
      order: {
        createdAt: 'ASC',
      },
    });

    return messages.map((message) => this.hydrateMessage(message));
  }

  private async validateMessageParticipants(
    conversationId: number,
    senderId: number,
  ): Promise<{ conversation: Conversation; sender: User }> {
    const conversation = await this.conversationsRepository.findOne({
      where: { id: conversationId },
      relations: {
        members: {
          user: true,
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found.');
    }

    const sender = await this.usersRepository.findOne({
      where: { id: senderId },
    });

    if (!sender) {
      throw new NotFoundException('Sender not found.');
    }

    const isMember = conversation.members.some(
      (member) => member.user.id === senderId,
    );

    if (!isMember) {
      throw new BadRequestException(
        'Sender must belong to the selected conversation.',
      );
    }

    return { conversation, sender };
  }

  private hydrateMessage(message: Message): Message {
    return {
      ...message,
      text: this.encryptionService.decryptText(message.text),
    };
  }
}
