import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTempDto {
  @IsNotEmpty()
  @IsString()
  user!: string;

  @IsNotEmpty()
  @IsString()
  tempPassword!: string;

  @IsOptional()
  @IsString()
  date?: string;
}
