import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TypeDocument = HydratedDocument<Type>;

@Schema({ collection: 'types', versionKey: false })
export class Type {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ required: true, default: 0 })
  priority: number;
}

export const TypeSchema = SchemaFactory.createForClass(Type);
