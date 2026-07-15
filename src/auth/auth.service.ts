import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { AuthenticatedUser } from './interfaces/authenticated-request.interface';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersRepository.findOne({
      where: { username: registerDto.username },
    });

    if (existingUser) {
      throw new ConflictException('Username is already in use.');
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 10);
    const user = this.usersRepository.create({
      username: registerDto.username.toLowerCase(),
      passwordHash,
    });

    const savedUser = await this.usersRepository.save(user);
    return this.buildAuthResponse(savedUser.id, savedUser.username);
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('LOWER(user.username) = :username', {
        username: loginDto.username.toLowerCase(),
      })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    return this.buildAuthResponse(user.id, user.username);
  }

  async refresh(refreshTokenDto: RefreshTokenDto) {
    const payload = await this.verifyRefreshToken(refreshTokenDto.refreshToken);

    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.refreshTokenHash')
      .where('user.id = :id', { id: payload.sub })
      .getOne();

    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const refreshTokenMatches = await bcrypt.compare(
      refreshTokenDto.refreshToken,
      user.refreshTokenHash,
    );

    if (!refreshTokenMatches) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    return this.buildAuthResponse(user.id, user.username);
  }

  async me(currentUser: AuthenticatedUser) {
    const user = await this.usersRepository.findOne({
      where: { id: currentUser.sub },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return this.toPublicUser(user);
  }

  async logout(currentUser: AuthenticatedUser) {
    await this.usersRepository.update(currentUser.sub, {
      refreshTokenHash: null,
    });

    return {
      message: 'Logged out successfully.',
    };
  }

  async changePassword(
    currentUser: AuthenticatedUser,
    changePasswordDto: ChangePasswordDto,
  ) {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id: currentUser.sub })
      .getOne();

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const passwordMatches = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Current password is incorrect.');
    }

    const nextPasswordHash = await bcrypt.hash(
      changePasswordDto.newPassword,
      10,
    );

    await this.usersRepository.update(user.id, {
      passwordHash: nextPasswordHash,
      refreshTokenHash: null,
    });

    return {
      message: 'Password changed successfully. Please log in again.',
    };
  }

  private async buildAuthResponse(id: number, username: string) {
    const accessToken = await this.jwtService.signAsync({
      sub: id,
      username,
    });

    const refreshToken = await this.jwtService.signAsync(
      {
        sub: id,
        username,
      },
      {
        secret: this.configService.get<string>(
          'JWT_REFRESH_SECRET',
          'refresh-secret',
        ),
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_EXPIRES_IN',
          '30d',
        ) as never,
      },
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await this.usersRepository.update(id, {
      refreshTokenHash,
    });

    return {
      accessToken,
      refreshToken,
      user: this.toPublicUser({
        id,
        username,
      } as User),
    };
  }

  private async verifyRefreshToken(refreshToken: string) {
    try {
      return await this.jwtService.verifyAsync<AuthenticatedUser>(
        refreshToken,
        {
          secret: this.configService.get<string>(
            'JWT_REFRESH_SECRET',
            'refresh-secret',
          ),
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid refresh token.');
    }
  }

  private toPublicUser(user: Pick<User, 'id' | 'username'>) {
    return {
      id: user.id,
      username: user.username,
    };
  }
}
