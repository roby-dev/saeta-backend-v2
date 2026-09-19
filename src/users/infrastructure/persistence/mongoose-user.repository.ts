import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { type Model, Types } from 'mongoose';
import type {
  CreateUserData,
  FindUsersFilter,
  PaginatedUsers,
  UpdateUserData,
  UserRepository,
} from '../../domain/user.repository.js';
import type {
  UserEntity,
  UserWithPassword,
} from '../../domain/user.entity.js';
import { User, type UserDocument } from './user.schema.js';

@Injectable()
export class MongooseUserRepository implements UserRepository {
  constructor(@InjectModel(User.name) private readonly userModel: Model<User>) {}

  async findById(id: string): Promise<UserEntity | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const doc = await this.userModel.findById(id).lean().exec();
    return doc ? this.toEntity(doc as UserDocument) : null;
  }

  async findByIdWithPassword(id: string): Promise<UserWithPassword | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const doc = await this.userModel
      .findById(id)
      .select('+password')
      .lean()
      .exec();

    return doc ? this.toEntityWithPassword(doc as UserDocument) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const doc = await this.userModel
      .findOne({ email: email.toLowerCase().trim() })
      .lean()
      .exec();

    return doc ? this.toEntity(doc as UserDocument) : null;
  }

  async findByDni(dni: string): Promise<UserEntity | null> {
    const doc = await this.userModel
      .findOne({ DNI: dni.trim() })
      .lean()
      .exec();

    return doc ? this.toEntity(doc as UserDocument) : null;
  }

  async findByPhone(phone: string): Promise<UserEntity | null> {
    const doc = await this.userModel
      .findOne({ phone: phone.trim() })
      .lean()
      .exec();

    return doc ? this.toEntity(doc as UserDocument) : null;
  }

  async findMany(filter: FindUsersFilter): Promise<PaginatedUsers> {
    const query: Record<string, unknown> = {};

    if (filter.role) {
      query.role = filter.role;
    }
    if (filter.statusAccount) {
      query.statusAccount = filter.statusAccount;
    }

    const skip = filter.skip ?? 0;
    const limit = filter.limit ?? 10;

    const [docs, total] = await Promise.all([
      this.userModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.userModel.countDocuments(query).exec(),
    ]);

    return {
      users: (docs as UserDocument[]).map((d) => this.toEntity(d)),
      total,
    };
  }

  async findSecurityPersonnel(): Promise<UserEntity[]> {
    const docs = await this.userModel
      .find({
        role: 'PERSONAL_SEGURIDAD',
        statusAccount: { $ne: 'INHABILITADO' },
      })
      .sort({ name: 1 })
      .lean()
      .exec();

    return (docs as UserDocument[]).map((d) => this.toEntity(d));
  }

  async create(data: CreateUserData): Promise<UserEntity> {
    const created = await this.userModel.create({
      name: data.name.trim(),
      lastname: data.lastname.trim(),
      DNI: data.dni.trim(),
      phone: data.phone.trim(),
      email: data.email.toLowerCase().trim(),
      password: data.passwordHash,
      role: data.role,
      statusAccount: data.statusAccount ?? 'HABILITADO',
      image: data.image,
      emergencyContacts: data.emergencyContacts ?? [],
    });

    return this.toEntity(created.toObject() as UserDocument);
  }

  async update(id: string, data: UpdateUserData): Promise<UserEntity | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const updateFields: Record<string, unknown> = {};

    if (data.name !== undefined) updateFields.name = data.name.trim();
    if (data.lastname !== undefined) updateFields.lastname = data.lastname.trim();
    if (data.phone !== undefined) updateFields.phone = data.phone.trim();
    if (data.email !== undefined) updateFields.email = data.email.toLowerCase().trim();
    if (data.image !== undefined) updateFields.image = data.image;
    if (data.emergencyContacts !== undefined) updateFields.emergencyContacts = data.emergencyContacts;
    if (data.statusAccount !== undefined) updateFields.statusAccount = data.statusAccount;
    if (data.availability !== undefined) updateFields.availability = data.availability;

    const updated = await this.userModel
      .findByIdAndUpdate(id, { $set: updateFields }, { new: true })
      .lean()
      .exec();

    return updated ? this.toEntity(updated as UserDocument) : null;
  }

  async updatePassword(id: string, passwordHash: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) {
      return false;
    }

    const result = await this.userModel
      .findByIdAndUpdate(id, { $set: { password: passwordHash } })
      .exec();

    return Boolean(result);
  }

  private toEntity(doc: UserDocument & { _id: Types.ObjectId; createdAt?: Date; updatedAt?: Date }): UserEntity {
    return {
      id: doc._id.toString(),
      name: doc.name,
      lastname: doc.lastname,
      dni: doc.DNI,
      phone: doc.phone,
      email: doc.email,
      role: doc.role,
      statusAccount: doc.statusAccount,
      image: doc.image,
      emergencyContacts: doc.emergencyContacts?.map((c) => ({
        name: c.name,
        phone: c.phone,
      })),
      availability: doc.availability,
      averageScore: doc.averageScore ?? 0,
      alertsAttended: doc.alertsAttended ?? 0,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  private toEntityWithPassword(
    doc: UserDocument & { _id: Types.ObjectId; createdAt?: Date; updatedAt?: Date },
  ): UserWithPassword {
    return {
      ...this.toEntity(doc),
      passwordHash: doc.password,
    };
  }
}
