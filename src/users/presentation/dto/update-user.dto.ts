import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { type AccountStatus, accountStatuses } from '../../domain/user.entity.js';
import { EmergencyContactDto } from './create-user.dto.js';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  lastname?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{9}$/, { message: 'Phone number must be exactly 9 digits' })
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5, { message: 'Maximum 5 emergency contacts are allowed' })
  @ValidateNested({ each: true })
  @Type(() => EmergencyContactDto)
  emergencyContacts?: EmergencyContactDto[];

  @IsOptional()
  @IsIn(accountStatuses)
  statusAccount?: AccountStatus;

  @IsOptional()
  @IsString()
  availability?: string;
}
