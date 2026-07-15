import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { ConversationMember } from './entities/conversation-member.entity';
import { Conversation } from './entities/conversation.entity';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationsRepository: Repository<Conversation>,
    @InjectRepository(ConversationMember)
    private readonly membersRepository: Repository<ConversationMember>,
    private readonly usersService: UsersService,
  ) {}

  async create(
    createConversationDto: CreateConversationDto,
    currentUserId: number,
  ): Promise<Conversation> {
    const targetUser = await this.usersService.findExactByUsername(
      createConversationDto.username,
    );

    if (targetUser.id === currentUserId) {
      throw new BadRequestException('You cannot open a chat with yourself.');
    }

    const existingConversation = await this.findDirectConversation(
      currentUserId,
      targetUser.id,
    );

    if (existingConversation) {
      return existingConversation;
    }

    const users = await this.usersService.findByIds([
      currentUserId,
      targetUser.id,
    ]);

    const conversation = this.conversationsRepository.create({
      members: users.map((user) =>
        this.membersRepository.create({
          user,
        }),
      ),
    });

    return this.conversationsRepository.save(conversation);
  }

  async findForUser(userId: number): Promise<Conversation[]> {
    const memberships = await this.membersRepository.find({
      where: {
        user: {
          id: userId,
        },
      },
      relations: {
        conversation: {
          members: true,
        },
      },
      order: {
        joinedAt: 'DESC',
      },
    });

    const conversationIds = memberships.map(
      (membership) => membership.conversation.id,
    );

    if (conversationIds.length === 0) {
      return [];
    }

    return this.conversationsRepository.find({
      where: {
        id: In(conversationIds),
      },
      relations: {
        members: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  private async findDirectConversation(
    firstUserId: number,
    secondUserId: number,
  ): Promise<Conversation | null> {
    const conversation = await this.conversationsRepository
      .createQueryBuilder('conversation')
      .innerJoinAndSelect('conversation.members', 'member')
      .innerJoinAndSelect('member.user', 'user')
      .where(
        `conversation.id IN (
          SELECT cm.conversationId
          FROM conversation_members cm
          WHERE cm.userId IN (:...userIds)
          GROUP BY cm.conversationId
          HAVING COUNT(*) = 2 AND COUNT(DISTINCT cm.userId) = 2
        )`,
        { userIds: [firstUserId, secondUserId] },
      )
      .getOne();

    return conversation ?? null;
  }
}
