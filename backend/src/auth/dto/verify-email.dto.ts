import { IsString, MaxLength, MinLength } from 'class-validator';
import { TrimString } from '../../common/transformers/string.transformers';

export class VerifyEmailDto {
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  @TrimString()
  token: string;
}
