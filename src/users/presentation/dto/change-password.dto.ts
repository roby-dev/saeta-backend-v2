import { IsOptional, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsOptional()
  @IsString()
  _id?: string;

  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Password must have at least 6 characters' })
  newPassword?: string;

  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Password must have at least 6 characters' })
  pass1?: string;

  @IsOptional()
  @IsString()
  currentPassword?: string;

  get resolvedPassword(): string {
    return this.newPassword ?? this.pass1 ?? '';
  }
}
