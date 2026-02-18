import { IsString, MinLength, MaxLength } from 'class-validator';
import { TrimString } from '../../common/transformers/string.transformers';

export class ResetPasswordDto {
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  @TrimString()
  token: string;

  @IsString()
  @MinLength(8)
  @MaxLength(50)
  password: string;
}
