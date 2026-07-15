import {
  IsAlphanumeric,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @IsAlphanumeric()
  username: string;

  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password: string;
}
