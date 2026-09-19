import { ConflictException, Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import * as bcrypt from 'bcrypt';
import type { UserEntity, UserRole } from '../../domain/user.entity.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/user.repository.js';
import { CreateUserCommand } from './create-user.command.js';

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand, UserEntity> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
  ) {}

  async execute(command: CreateUserCommand): Promise<UserEntity> {
    const [existingDni, existingEmail, existingPhone] = await Promise.all([
      this.users.findByDni(command.dni),
      this.users.findByEmail(command.email),
      this.users.findByPhone(command.phone),
    ]);

    if (existingDni) {
      throw new ConflictException('DNI is already registered');
    }
    if (existingEmail) {
      throw new ConflictException('Email is already registered');
    }
    if (existingPhone) {
      throw new ConflictException('Phone number is already registered');
    }

    // Role privilege escalation guard: only ADMIN or BASE_SEGURIDAD can assign non-CIUDADANO roles
    const allowedElevatedCreators: UserRole[] = ['ADMIN', 'BASE_SEGURIDAD'];
    const assignedRole: UserRole =
      command.creatorRole && allowedElevatedCreators.includes(command.creatorRole)
        ? (command.requestedRole ?? 'CIUDADANO')
        : 'CIUDADANO';

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(command.password, salt);

    return this.users.create({
      name: command.name,
      lastname: command.lastname,
      dni: command.dni,
      phone: command.phone,
      email: command.email,
      passwordHash,
      role: assignedRole,
      statusAccount: 'HABILITADO',
      emergencyContacts: command.emergencyContacts,
      image: command.image,
    });
  }
}
