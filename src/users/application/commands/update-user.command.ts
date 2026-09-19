import type {
  AccountStatus,
  EmergencyContact,
  UserRole,
} from '../../domain/user.entity.js';

export class UpdateUserCommand {
  constructor(
    public readonly targetUserId: string,
    public readonly currentUserId: string,
    public readonly currentUserRole: UserRole,
    public readonly data: {
      name?: string;
      lastname?: string;
      phone?: string;
      email?: string;
      image?: string;
      emergencyContacts?: EmergencyContact[];
      statusAccount?: AccountStatus;
      availability?: string;
    },
  ) {}
}
