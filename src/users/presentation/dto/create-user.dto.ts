import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { type UserRole, userRoles } from '../../domain/user.entity.js';

export class EmergencyContactDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @Transform(({ value }) => normalizePeruvianPhone(value))
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{9}$/, { message: 'Contact phone must be exactly 9 digits' })
  phone: string;
}

const PERU_COUNTRY_CODE = '51';

// Device contacts often come formatted ("+51 987 654 321", "987-654-321").
// Strip separators and the Peruvian country code so only the 9-digit number remains.
function normalizePeruvianPhone(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith(PERU_COUNTRY_CODE)) {
    return digits.slice(PERU_COUNTRY_CODE.length);
  }
  return digits;
}

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  lastname: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{8}$/, { message: 'DNI must be exactly 8 digits' })
  dni: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{9}$/, { message: 'Phone number must be exactly 9 digits' })
  phone: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must have at least 6 characters' })
  password: string;

  @IsOptional()
  @IsIn(userRoles)
  role?: UserRole;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5, { message: 'Maximum 5 emergency contacts are allowed' })
  @ValidateNested({ each: true })
  @Type(() => EmergencyContactDto)
  emergencyContacts?: EmergencyContactDto[];

  @IsOptional()
  @IsString()
  image?: string;
}
