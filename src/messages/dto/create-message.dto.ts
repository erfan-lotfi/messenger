import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateMessageDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  conversationId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  text: string;
}

export class CreateMediaMessageDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  conversationId: number;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  text?: string;
}
