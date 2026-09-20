import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateAlertDto {
  @IsOptional()
  state?: string | { _id?: string };

  @IsOptional()
  @IsString()
  stateId?: string;

  @IsOptional()
  attendedBy?: string | { _id?: string };

  @IsOptional()
  @IsString()
  attendedById?: string;

  @IsOptional()
  @IsString()
  attentionDate?: string;

  @IsOptional()
  @IsString()
  culminationDate?: string;

  @IsOptional()
  @IsString()
  commentary?: string;

  @IsOptional()
  @IsNumber()
  score?: number;

  get resolvedStateId(): string | undefined {
    if (this.stateId) return this.stateId;
    if (!this.state) return undefined;
    return typeof this.state === 'object' ? this.state._id : this.state;
  }

  get resolvedAttendedById(): string | undefined {
    if (this.attendedById !== undefined) return this.attendedById;
    if (!this.attendedBy) return undefined;
    return typeof this.attendedBy === 'object'
      ? this.attendedBy._id
      : this.attendedBy;
  }
}
