import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';
import { TrimString } from '../../common/transformers/string.transformers';

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @TrimString()
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @TrimString()
  format: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  @TrimString()
  description?: string;
}
