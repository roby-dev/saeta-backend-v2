import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type StateDocument = HydratedDocument<State>;

@Schema({ collection: 'states', versionKey: false })
export class State {
  @Prop({ required: true, unique: true, trim: true })
  name: string;
}

export const StateSchema = SchemaFactory.createForClass(State);
