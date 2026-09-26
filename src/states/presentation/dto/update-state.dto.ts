import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { StateCode } from '../../domain/state-code.enum.js';

export class UpdateStateDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del estado de alerta es obligatorio' })
  name: string;

  @IsOptional()
  @IsEnum(StateCode, { message: 'Código de estado inválido' })
  code?: StateCode;
}
