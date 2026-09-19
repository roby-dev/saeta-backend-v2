import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateTypeDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del tipo de alerta es obligatorio' })
  name: string;

  @IsOptional()
  @IsNumber()
  priority?: number;
}
