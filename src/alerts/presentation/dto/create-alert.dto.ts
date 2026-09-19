import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateAlertDto {
  @IsNumber()
  @IsNotEmpty()
  latitude: number;

  @IsNumber()
  @IsNotEmpty()
  longitude: number;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  id_user?: string;
}
