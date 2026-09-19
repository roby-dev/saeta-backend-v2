import type { EmergencyContact, UserRole } from '../../domain/user.entity.js';

export class CreateUserCommand {
  constructor(
    public readonly name: string,
    public readonly lastname: string,
    public readonly dni: string,
    public readonly phone: string,
    public readonly email: string,
    public readonly password: string,
    public readonly requestedRole?: UserRole,
    public readonly creatorRole?: UserRole,
    public readonly emergencyContacts?: EmergencyContact[],
    public readonly image?: string,
  ) {}
}
