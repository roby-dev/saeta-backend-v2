import { IsOptional, IsString } from 'class-validator';

export class RejectAlertDto {
  @IsOptional()
  @IsString()
  commentary?: string;
}
