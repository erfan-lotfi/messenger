import {
  Body,
  Controller,
  Get,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';
import { CreateMessageDto } from './dto/create-message.dto';
import { Message } from './entities/message.entity';
import { MessagesService } from './messages.service';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  create(
    @Body() createMessageDto: CreateMessageDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Message> {
    return this.messagesService.create(createMessageDto, user.sub);
  }

  @Get()
  findForConversation(
    @Query('conversationId', ParseIntPipe) conversationId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Message[]> {
    return this.messagesService.findForConversation(conversationId, user.sub);
  }
}
