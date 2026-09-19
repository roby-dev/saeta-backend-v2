import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type TempDocument = HydratedDocument<Temp>;

@Schema({ collection: 'temps', timestamps: false, versionKey: false })
export class Temp {
  @Prop({
    required: true,
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
  })
  user: Types.ObjectId;

  @Prop({ required: true, type: String })
  tempPassword: string;

  @Prop({ required: true, type: String })
  date: string;
}

export const TempSchema = SchemaFactory.createForClass(Temp);
