import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateAlertFeedbackDto {
  @IsOptional()
  @IsString()
  commentary?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  score?: number;
}
