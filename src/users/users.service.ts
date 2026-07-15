import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findExactByUsername(username: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: {
        username: username.toLowerCase(),
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return user;
  }

  findByIds(ids: number[]): Promise<User[]> {
    return this.usersRepository.find({
      where: {
        id: In(ids),
      },
    });
  }
}
