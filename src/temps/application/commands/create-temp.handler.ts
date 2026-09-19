import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../users/domain/user.repository.js';
import type { TempEntity } from '../../domain/temp.entity.js';
import {
  TEMP_REPOSITORY,
  type TempRepository,
} from '../../domain/temp.repository.js';
import { CreateTempCommand } from './create-temp.command.js';

function getLimaFormattedDate(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  };
  return new Intl.DateTimeFormat('es-PE', options).format(now);
}

@Injectable()
@CommandHandler(CreateTempCommand)
export class CreateTempHandler
  implements ICommandHandler<CreateTempCommand, TempEntity>
{
  constructor(
    @Inject(TEMP_REPOSITORY)
    private readonly tempRepository: TempRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(command: CreateTempCommand): Promise<TempEntity> {
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${command.userId} not found`);
    }

    const date = command.date ?? getLimaFormattedDate();

    return this.tempRepository.create({
      userId: command.userId,
      tempPassword: command.tempPassword,
      date,
    });
  }
}
