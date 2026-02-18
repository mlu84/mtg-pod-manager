import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { TrimString } from '../../common/transformers/string.transformers';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(50)
  @TrimString()
  inAppName?: string;
}
