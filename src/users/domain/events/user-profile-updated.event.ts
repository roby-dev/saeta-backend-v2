import type { UserEntity } from '../user.entity.js';

export class UserProfileUpdatedEvent {
  constructor(public readonly user: UserEntity) {}
}
