import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { TrimString } from '../../common/transformers/string.transformers';

export class VerifyEmailDto {
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  @Matches(/^[a-f0-9]+$/i, { message: 'Invalid verification token format' })
  @TrimString()
  token: string;
}
