import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { type Model, Types } from 'mongoose';
import type { TypeEntity } from '../../domain/type.entity.js';
import type { TypeRepository } from '../../domain/type.repository.js';
import { Type, type TypeDocument } from './type.schema.js';

@Injectable()
export class MongooseTypeRepository implements TypeRepository {
  constructor(@InjectModel(Type.name) private readonly typeModel: Model<Type>) {}

  async findAll(
    skip?: number,
    limit?: number,
  ): Promise<{ types: TypeEntity[]; total: number }> {
    const query = this.typeModel.find({}).sort({ priority: -1, name: 1 });

    if (skip !== undefined) query.skip(skip);
    if (limit !== undefined) query.limit(limit);

    const [docs, total] = await Promise.all([
      query.lean().exec(),
      this.typeModel.countDocuments().exec(),
    ]);

    return {
      types: docs.map((d) => this.toEntity(d as TypeDocument)),
      total,
    };
  }

  async findById(id: string): Promise<TypeEntity | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const doc = await this.typeModel.findById(id).lean().exec();
    return doc ? this.toEntity(doc as TypeDocument) : null;
  }

  async findByName(name: string): Promise<TypeEntity | null> {
    const doc = await this.typeModel
      .findOne({
        name: { $regex: `^${name.trim()}$`, $options: 'i' },
      })
      .lean()
      .exec();

    return doc ? this.toEntity(doc as TypeDocument) : null;
  }

  async create(name: string, priority: number = 0): Promise<TypeEntity> {
    const created = await this.typeModel.create({
      name: name.trim(),
      priority,
    });
    return this.toEntity(created.toObject() as TypeDocument);
  }

  async update(
    id: string,
    name?: string,
    priority?: number,
  ): Promise<TypeEntity | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const updateFields: Record<string, unknown> = {};
    if (name !== undefined) updateFields.name = name.trim();
    if (priority !== undefined) updateFields.priority = priority;

    const updated = await this.typeModel
      .findByIdAndUpdate(id, { $set: updateFields }, { new: true })
      .lean()
      .exec();

    return updated ? this.toEntity(updated as TypeDocument) : null;
  }

  private toEntity(doc: TypeDocument & { _id: Types.ObjectId }): TypeEntity {
    return {
      id: doc._id.toString(),
      name: doc.name,
      priority: doc.priority ?? 0,
    };
  }
}
