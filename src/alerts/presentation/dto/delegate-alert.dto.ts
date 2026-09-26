import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class DelegateAlertDto {
  @IsMongoId({ message: 'attendedById debe ser un identificador válido' })
  attendedById: string;

  @IsOptional()
  @IsString()
  commentary?: string;
}
