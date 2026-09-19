import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { userRoles, type UserRole } from '../../domain/auth-user.js';

export type UserDocument = HydratedDocument<User>;

@Schema({ collection: 'users', timestamps: true, versionKey: false })
export class User {
  @Prop({ required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ required: true, enum: userRoles, default: 'CIUDADANO' })
  role: UserRole;

  @Prop({ required: true, default: 'HABILITADO' })
  statusAccount: string;

  @Prop({ required: false, trim: true })
  name?: string;

  @Prop({ required: false, trim: true })
  lastname?: string;

  @Prop({ required: false, trim: true })
  DNI?: string;

  @Prop({ required: false, trim: true })
  phone?: string;

  @Prop({ required: false })
  image?: string;

  @Prop({ required: false })
  availability?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
