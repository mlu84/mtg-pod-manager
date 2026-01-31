import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  format: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}
