import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { type Model, Types } from 'mongoose';
import type { AlertEntity } from '../../domain/alert.entity.js';
import type {
  AlertRepository,
  AlertStateCounts,
  CreateAlertData,
  FindAlertsFilter,
  PaginatedAlerts,
  UpdateAlertData,
} from '../../domain/alert.repository.js';
import { State } from './alert-state.schema.js';
import { Alert, type AlertDocument } from './alert.schema.js';

interface PopulatedUser {
  _id: Types.ObjectId;
  name: string;
  lastname?: string;
  DNI?: string;
  phone?: string;
  email?: string;
  image?: string;
  role?: string;
  availability?: string;
  statusAccount?: string;
  averageScore?: number;
  alertsAttended?: number;
}

interface PopulatedNamed {
  _id: Types.ObjectId;
  name: string;
  priority?: number;
}

@Injectable()
export class MongooseAlertRepository implements AlertRepository {
  constructor(
    @InjectModel(Alert.name) private readonly alertModel: Model<Alert>,
    @InjectModel(State.name) private readonly stateModel: Model<State>,
  ) {}

  async findById(id: string): Promise<AlertEntity | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const doc = await this.alertModel
      .findById(id)
      .populate<{ id_user: PopulatedUser }>('id_user', 'name lastname DNI image role email phone')
      .populate<{ attendedBy?: PopulatedUser }>(
        'attendedBy',
        'name lastname DNI image email phone role availability statusAccount',
      )
      .populate<{ type: PopulatedNamed }>('type', 'name priority')
      .populate<{ state: PopulatedNamed }>('state', 'name')
      .lean()
      .exec();

    return doc ? this.toEntity(doc as never) : null;
  }

  async findMany(filter: FindAlertsFilter): Promise<PaginatedAlerts> {
    const query: Record<string, unknown> = {};

    if (filter.stateId && Types.ObjectId.isValid(filter.stateId)) {
      query.state = new Types.ObjectId(filter.stateId);
    }
    if (filter.typeId && Types.ObjectId.isValid(filter.typeId)) {
      query.type = new Types.ObjectId(filter.typeId);
    }

    const skip = filter.skip ?? 0;
    const limit = filter.limit ?? 20;

    const [docs, total, alertsByStateAgg, statesList] = await Promise.all([
      this.alertModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate<{ id_user: PopulatedUser }>('id_user', 'name lastname DNI image role email phone')
        .populate<{ attendedBy?: PopulatedUser }>(
          'attendedBy',
          'name lastname DNI image email phone role availability statusAccount',
        )
        .populate<{ type: PopulatedNamed }>('type', 'name priority')
        .populate<{ state: PopulatedNamed }>('state', 'name')
        .lean()
        .exec(),
      this.alertModel.countDocuments(query).exec(),
      this.alertModel.aggregate<{ _id: Types.ObjectId; count: number }>([
        { $group: { _id: '$state', count: { $sum: 1 } } },
      ]),
      this.stateModel.find().lean().exec(),
    ]);

    const stateCountMap = new Map<string, number>();
    for (const item of alertsByStateAgg) {
      if (item._id) {
        stateCountMap.set(item._id.toString(), item.count);
      }
    }

    let pending = 0;
    let inProcess = 0;
    let resolved = 0;
    let rejected = 0;
    let totalAllAlerts = 0;

    for (const st of statesList) {
      const count = stateCountMap.get(st._id.toString()) ?? 0;
      totalAllAlerts += count;
      const upperName = st.name.toUpperCase();

      if (upperName.includes('PENDIENTE')) {
        pending += count;
      } else if (upperName.includes('PROCESO')) {
        inProcess += count;
      } else if (upperName.includes('RESUELT')) {
        resolved += count;
      } else if (upperName.includes('RECHAZAD') || upperName.includes('CANCELAD')) {
        rejected += count;
      }
    }

    const stateCounts: AlertStateCounts = {
      pending,
      inProcess,
      resolved,
      rejected,
      total: totalAllAlerts,
    };

    return {
      alerts: docs.map((d) => this.toEntity(d as never)),
      total,
      stateCounts,
    };
  }

  async findByUser(userId: string): Promise<{ alerts: AlertEntity[]; total: number }> {
    if (!Types.ObjectId.isValid(userId)) {
      return { alerts: [], total: 0 };
    }

    const query = { id_user: new Types.ObjectId(userId) };

    const [docs, total] = await Promise.all([
      this.alertModel
        .find(query)
        .sort({ createdAt: -1 })
        .populate<{ id_user: PopulatedUser }>('id_user', 'name lastname DNI image role email phone')
        .populate<{ attendedBy?: PopulatedUser }>(
          'attendedBy',
          'name lastname DNI image email phone role availability statusAccount',
        )
        .populate<{ type: PopulatedNamed }>('type', 'name priority')
        .populate<{ state: PopulatedNamed }>('state', 'name')
        .lean()
        .exec(),
      this.alertModel.countDocuments(query).exec(),
    ]);

    return {
      alerts: docs.map((d) => this.toEntity(d as never)),
      total,
    };
  }

  async findByAttendedUser(attendedById: string): Promise<{ alerts: AlertEntity[]; total: number }> {
    if (!Types.ObjectId.isValid(attendedById)) {
      return { alerts: [], total: 0 };
    }

    const query = { attendedBy: new Types.ObjectId(attendedById) };

    const [docs, total] = await Promise.all([
      this.alertModel
        .find(query)
        .sort({ createdAt: -1 })
        .populate<{ id_user: PopulatedUser }>('id_user', 'name lastname DNI image role email phone')
        .populate<{ attendedBy?: PopulatedUser }>(
          'attendedBy',
          'name lastname DNI image email phone role availability statusAccount',
        )
        .populate<{ type: PopulatedNamed }>('type', 'name priority')
        .populate<{ state: PopulatedNamed }>('state', 'name')
        .lean()
        .exec(),
      this.alertModel.countDocuments(query).exec(),
    ]);

    return {
      alerts: docs.map((d) => this.toEntity(d as never)),
      total,
    };
  }

  async findPendingByUser(userId: string): Promise<AlertEntity | null> {
    if (!Types.ObjectId.isValid(userId)) {
      return null;
    }

    const pendingStateId = await this.getDefaultPendingStateId();
    if (!pendingStateId) {
      return null;
    }

    const doc = await this.alertModel
      .findOne({
        id_user: new Types.ObjectId(userId),
        state: new Types.ObjectId(pendingStateId),
      })
      .lean()
      .exec();

    return doc ? this.toEntity(doc as never) : null;
  }

  async create(data: CreateAlertData): Promise<AlertEntity> {
    const created = await this.alertModel.create({
      id_user: new Types.ObjectId(data.userId),
      latitude: data.latitude,
      longitude: data.longitude,
      type: new Types.ObjectId(data.typeId),
      state: new Types.ObjectId(data.stateId),
      creationDate: data.creationDate,
    });

    const populated = await this.findById(created._id.toString());
    return populated ?? this.toEntity(created.toObject() as never);
  }

  async update(id: string, data: UpdateAlertData): Promise<AlertEntity | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const updateFields: Record<string, unknown> = {};

    if (data.stateId !== undefined && Types.ObjectId.isValid(data.stateId)) {
      updateFields.state = new Types.ObjectId(data.stateId);
    }
    if (data.attendedById !== undefined && Types.ObjectId.isValid(data.attendedById)) {
      updateFields.attendedBy = new Types.ObjectId(data.attendedById);
    }
    if (data.attentionDate !== undefined) updateFields.attentionDate = data.attentionDate;
    if (data.culminationDate !== undefined) updateFields.culminationDate = data.culminationDate;
    if (data.commentary !== undefined) updateFields.commentary = data.commentary;
    if (data.score !== undefined) updateFields.score = data.score;

    await this.alertModel.findByIdAndUpdate(id, { $set: updateFields }).exec();
    return this.findById(id);
  }

  async deletePending(): Promise<number> {
    const pendingStateId = await this.getDefaultPendingStateId();
    if (!pendingStateId) {
      return 0;
    }

    const result = await this.alertModel
      .deleteMany({ state: new Types.ObjectId(pendingStateId) })
      .exec();

    return result.deletedCount ?? 0;
  }

  async getDefaultPendingStateId(): Promise<string | null> {
    const state = await this.stateModel
      .findOne({ name: { $regex: /pendiente/i } })
      .lean()
      .exec();

    if (state) {
      return state._id.toString();
    }

    // Legacy fallback known state id
    return '6163a7eac89043838a762432';
  }

  private toEntity(
    doc: AlertDocument & {
      _id: Types.ObjectId;
      id_user: Types.ObjectId | PopulatedUser;
      attendedBy?: Types.ObjectId | PopulatedUser;
      type: Types.ObjectId | PopulatedNamed;
      state: Types.ObjectId | PopulatedNamed;
      createdAt?: Date;
      updatedAt?: Date;
    },
  ): AlertEntity {
    const isUserPopulated = doc.id_user && typeof doc.id_user === 'object' && 'name' in doc.id_user;
    const isAttendedPopulated =
      doc.attendedBy && typeof doc.attendedBy === 'object' && 'name' in doc.attendedBy;
    const isTypePopulated = doc.type && typeof doc.type === 'object' && 'name' in doc.type;
    const isStatePopulated = doc.state && typeof doc.state === 'object' && 'name' in doc.state;

    return {
      id: doc._id.toString(),
      userId: isUserPopulated
        ? (doc.id_user as PopulatedUser)._id.toString()
        : doc.id_user.toString(),
      latitude: doc.latitude,
      longitude: doc.longitude,
      typeId: isTypePopulated
        ? (doc.type as PopulatedNamed)._id.toString()
        : doc.type.toString(),
      stateId: isStatePopulated
        ? (doc.state as PopulatedNamed)._id.toString()
        : doc.state.toString(),
      creationDate: doc.creationDate,
      attentionDate: doc.attentionDate,
      culminationDate: doc.culminationDate,
      attendedById: doc.attendedBy
        ? isAttendedPopulated
          ? (doc.attendedBy as PopulatedUser)._id.toString()
          : doc.attendedBy.toString()
        : undefined,
      commentary: doc.commentary,
      score: doc.score,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      user: isUserPopulated
        ? {
            id: (doc.id_user as PopulatedUser)._id.toString(),
            name: (doc.id_user as PopulatedUser).name,
            lastname: (doc.id_user as PopulatedUser).lastname,
            dni: (doc.id_user as PopulatedUser).DNI,
            phone: (doc.id_user as PopulatedUser).phone,
            email: (doc.id_user as PopulatedUser).email,
            image: (doc.id_user as PopulatedUser).image,
            role: (doc.id_user as PopulatedUser).role,
            statusAccount: (doc.id_user as PopulatedUser).statusAccount,
          }
        : undefined,
      attendedBy: isAttendedPopulated
        ? {
            id: (doc.attendedBy as PopulatedUser)._id.toString(),
            name: (doc.attendedBy as PopulatedUser).name,
            lastname: (doc.attendedBy as PopulatedUser).lastname,
            dni: (doc.attendedBy as PopulatedUser).DNI,
            phone: (doc.attendedBy as PopulatedUser).phone,
            email: (doc.attendedBy as PopulatedUser).email,
            image: (doc.attendedBy as PopulatedUser).image,
            role: (doc.attendedBy as PopulatedUser).role,
            availability: (doc.attendedBy as PopulatedUser).availability,
            statusAccount: (doc.attendedBy as PopulatedUser).statusAccount,
          }
        : undefined,
      type: isTypePopulated
        ? {
            id: (doc.type as PopulatedNamed)._id.toString(),
            name: (doc.type as PopulatedNamed).name,
            priority: (doc.type as PopulatedNamed).priority,
          }
        : undefined,
      state: isStatePopulated
        ? {
            id: (doc.state as PopulatedNamed)._id.toString(),
            name: (doc.state as PopulatedNamed).name,
          }
        : undefined,
    };
  }
}
