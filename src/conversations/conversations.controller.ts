import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { Conversation } from './entities/conversation.entity';
import { ConversationsService } from './conversations.service';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  create(
    @Body() createConversationDto: CreateConversationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Conversation> {
    return this.conversationsService.create(createConversationDto, user.sub);
  }

  @Get()
  findForUser(@CurrentUser() user: AuthenticatedUser): Promise<Conversation[]> {
    return this.conversationsService.findForUser(user.sub);
  }
}
