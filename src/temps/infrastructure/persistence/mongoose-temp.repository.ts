import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TempEntity } from '../../domain/temp.entity.js';
import type { TempRepository } from '../../domain/temp.repository.js';
import { Temp, type TempDocument } from './temp.schema.js';

interface PopulatedUser {
  _id: Types.ObjectId | string;
  name?: string;
  lastname?: string;
  DNI?: string;
  image?: string;
  role?: string;
}

interface RawTempDoc {
  _id: Types.ObjectId | string;
  user: Types.ObjectId | string | PopulatedUser;
  tempPassword: string;
  date: string;
  toObject?: () => RawTempDoc;
}

@Injectable()
export class MongooseTempRepository implements TempRepository {
  constructor(
    @InjectModel(Temp.name)
    private readonly tempModel: Model<TempDocument>,
  ) {}

  async findAll(): Promise<TempEntity[]> {
    const docs = await this.tempModel
      .find()
      .populate('user', 'name lastname DNI image role')
      .exec();

    return docs.map((doc) => this.toEntity(doc as unknown as RawTempDoc));
  }

  async findByUser(userId: string): Promise<TempEntity | null> {
    if (!Types.ObjectId.isValid(userId)) {
      return null;
    }

    const doc = await this.tempModel
      .findOne({ user: new Types.ObjectId(userId) })
      .populate('user', 'name lastname DNI image role')
      .exec();

    return doc ? this.toEntity(doc as unknown as RawTempDoc) : null;
  }

  async findById(id: string): Promise<TempEntity | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const doc = await this.tempModel
      .findById(id)
      .populate('user', 'name lastname DNI image role')
      .exec();

    return doc ? this.toEntity(doc as unknown as RawTempDoc) : null;
  }

  async create(data: {
    userId: string;
    tempPassword: string;
    date: string;
  }): Promise<TempEntity> {
    const created = await this.tempModel.create({
      user: new Types.ObjectId(data.userId),
      tempPassword: data.tempPassword,
      date: data.date,
    });

    return this.toEntity(created as unknown as RawTempDoc);
  }

  async delete(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) {
      return false;
    }

    const result = await this.tempModel.findByIdAndDelete(id).exec();
    return result !== null;
  }

  private toEntity(doc: RawTempDoc): TempEntity {
    const obj = doc.toObject ? doc.toObject() : doc;
    const user = obj.user;
    const isPopulatedUser =
      user !== null &&
      typeof user === 'object' &&
      Boolean((user as PopulatedUser)._id);

    const populated = isPopulatedUser ? (user as PopulatedUser) : null;

    const userId = populated
      ? populated._id.toString()
      : typeof user === 'string'
        ? user
        : user instanceof Types.ObjectId
          ? user.toString()
          : '';

    return {
      id: obj._id.toString(),
      userId,
      tempPassword: obj.tempPassword,
      date: obj.date,
      user: populated
        ? {
            id: populated._id.toString(),
            name: populated.name ?? '',
            lastname: populated.lastname ?? '',
            dni: populated.DNI,
            image: populated.image,
            role: populated.role,
          }
        : undefined,
    };
  }
}
