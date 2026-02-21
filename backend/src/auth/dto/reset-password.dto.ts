import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { TrimString } from '../../common/transformers/string.transformers';

export class ResetPasswordDto {
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  @Matches(/^[a-f0-9]+$/i, { message: 'Invalid reset token format' })
  @TrimString()
  token: string;

  @IsString()
  @MinLength(8)
  @MaxLength(50)
  @Matches(/^(?!.*[\u0000-\u001F\u007F]).+$/u, {
    message: 'Password contains unsupported control characters',
  })
  password: string;
}
