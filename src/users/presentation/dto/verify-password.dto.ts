import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class VerifyPasswordDto {
  @IsOptional()
  @IsString()
  _id?: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
