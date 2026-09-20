import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  type AccountStatus,
  accountStatuses,
  type EmergencyContact,
  type UserRole,
  userRoles,
} from '../../domain/user.entity.js';

export type UserDocument = HydratedDocument<User>;

@Schema({ _id: false })
export class EmergencyContactSchema implements EmergencyContact {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  phone: string;
}

@Schema({ collection: 'users', timestamps: true, versionKey: false })
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  lastname: string;

  @Prop({ required: true, unique: true, trim: true })
  DNI: string;

  @Prop({ required: true, trim: true })
  phone: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ required: true, type: String, enum: userRoles, default: 'CIUDADANO' })
  role: UserRole;

  @Prop({ required: true, type: String, enum: accountStatuses, default: 'HABILITADO' })
  statusAccount: AccountStatus;

  @Prop({ default: () => [] })
  emergencyContacts: EmergencyContactSchema[];

  @Prop({ required: false })
  image?: string;

  @Prop({ required: false })
  availability?: string;

  @Prop({ required: false, default: 0 })
  averageScore?: number;

  @Prop({ required: false, default: 0 })
  alertsAttended?: number;
}

export const UserSchema = SchemaFactory.createForClass(User);
