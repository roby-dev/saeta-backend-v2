import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type AlertDocument = HydratedDocument<Alert>;

@Schema({ collection: 'alerts', timestamps: true, versionKey: false })
export class Alert {
  @Prop({
    required: true,
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
  })
  id_user: Types.ObjectId;

  @Prop({ required: true })
  latitude: number;

  @Prop({ required: true })
  longitude: number;

  @Prop({
    required: true,
    type: MongooseSchema.Types.ObjectId,
    ref: 'Type',
  })
  type: Types.ObjectId;

  @Prop({
    required: true,
    type: MongooseSchema.Types.ObjectId,
    ref: 'State',
  })
  state: Types.ObjectId;

  @Prop({ required: true })
  creationDate: string;

  @Prop({ required: false })
  attentionDate?: string;

  @Prop({
    required: false,
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
  })
  attendedBy?: Types.ObjectId;

  @Prop({ required: false })
  culminationDate?: string;

  @Prop({ required: false })
  commentary?: string;

  @Prop({ required: false })
  score?: number;
}

export const AlertSchema = SchemaFactory.createForClass(Alert);
