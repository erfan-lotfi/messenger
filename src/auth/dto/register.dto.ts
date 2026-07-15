import {
  IsAlphanumeric,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(30)
  @IsAlphanumeric()
  username: string;

  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password: string;
}
