import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { type Model, Types } from 'mongoose';
import type {
  AuthUser,
  AuthUserProfile,
} from '../../domain/auth-user.js';
import type { AuthUserRepository } from '../../domain/auth-user.repository.js';
import { User, type UserDocument } from './user.schema.js';

@Injectable()
export class MongooseAuthUserRepository implements AuthUserRepository {
  constructor(@InjectModel(User.name) private readonly users: Model<User>) {}

  async findByEmail(email: string): Promise<AuthUser | null> {
    const user = await this.users
      .findOne({ email: email.toLowerCase() })
      .select('+password')
      .lean()
      .exec();

    return user ? this.toAuthUser(user as UserDocument) : null;
  }

  async findProfileById(id: string): Promise<AuthUserProfile | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const user = await this.users
      .findById(id)
      .select('email role')
      .lean()
      .exec();

    return user
      ? { id: user._id.toString(), email: user.email, role: user.role }
      : null;
  }

  private toAuthUser(user: UserDocument): AuthUser {
    return {
      id: user._id.toString(),
      email: user.email,
      passwordHash: user.password,
      role: user.role,
      statusAccount: user.statusAccount,
    };
  }
}
