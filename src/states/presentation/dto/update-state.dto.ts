import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateStateDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del estado de alerta es obligatorio' })
  name: string;
}
