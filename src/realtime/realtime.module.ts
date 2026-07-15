import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from '../conversations/entities/conversation.entity';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Conversation]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'dev-secret'),
      }),
    }),
  ],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class RealtimeModule {}
