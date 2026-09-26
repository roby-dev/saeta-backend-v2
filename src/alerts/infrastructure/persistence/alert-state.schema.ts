import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { StateCode } from '../../../states/domain/state-code.enum.js';

export type StateDocument = HydratedDocument<State>;

@Schema({ collection: 'states', versionKey: false })
export class State {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: String, enum: Object.values(StateCode), required: false })
  code?: StateCode;
}

export const StateSchema = SchemaFactory.createForClass(State);
