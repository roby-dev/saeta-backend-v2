import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { type Model, Types } from 'mongoose';
import type { StateEntity } from '../../domain/state.entity.js';
import type { StateRepository } from '../../domain/state.repository.js';
import { State, type StateDocument } from './state.schema.js';

@Injectable()
export class MongooseStateRepository implements StateRepository {
  constructor(@InjectModel(State.name) private readonly stateModel: Model<State>) {}

  async findAll(): Promise<StateEntity[]> {
    const docs = await this.stateModel
      .find({})
      .sort({ name: 1 })
      .lean()
      .exec();

    return docs.map((d) => this.toEntity(d as StateDocument));
  }

  async findById(id: string): Promise<StateEntity | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const doc = await this.stateModel.findById(id).lean().exec();
    return doc ? this.toEntity(doc as StateDocument) : null;
  }

  async findByName(name: string): Promise<StateEntity | null> {
    const doc = await this.stateModel
      .findOne({
        name: { $regex: `^${name.trim()}$`, $options: 'i' },
      })
      .lean()
      .exec();

    return doc ? this.toEntity(doc as StateDocument) : null;
  }

  async create(name: string): Promise<StateEntity> {
    const created = await this.stateModel.create({ name: name.trim() });
    return this.toEntity(created.toObject() as StateDocument);
  }

  async update(id: string, name: string): Promise<StateEntity | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const updated = await this.stateModel
      .findByIdAndUpdate(id, { $set: { name: name.trim() } }, { new: true })
      .lean()
      .exec();

    return updated ? this.toEntity(updated as StateDocument) : null;
  }

  private toEntity(doc: StateDocument & { _id: Types.ObjectId }): StateEntity {
    return {
      id: doc._id.toString(),
      name: doc.name,
    };
  }
}
