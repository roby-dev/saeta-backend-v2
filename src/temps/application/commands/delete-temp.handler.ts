import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import {
  TEMP_REPOSITORY,
  type TempRepository,
} from '../../domain/temp.repository.js';
import { DeleteTempCommand } from './delete-temp.command.js';

@Injectable()
@CommandHandler(DeleteTempCommand)
export class DeleteTempHandler
  implements ICommandHandler<DeleteTempCommand, { success: boolean; message: string }>
{
  constructor(
    @Inject(TEMP_REPOSITORY)
    private readonly tempRepository: TempRepository,
  ) {}

  async execute(
    command: DeleteTempCommand,
  ): Promise<{ success: boolean; message: string }> {
    const existing = await this.tempRepository.findById(command.id);
    if (!existing) {
      throw new NotFoundException(`Temporary record with ID ${command.id} not found`);
    }

    await this.tempRepository.delete(command.id);

    return {
      success: true,
      message: 'Temporal eliminado',
    };
  }
}
