import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { NormalizeEmail, TrimString } from '../../common/transformers/string.transformers';

export class CreateAuthDto {
  @IsEmail()
  @MaxLength(191)
  @NormalizeEmail()
  email: string;

  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[\p{L}\p{N}\s._'-]+$/u, {
    message:
      'Display name may contain letters, numbers, spaces, apostrophes, dots, underscores, and hyphens only',
  })
  @TrimString()
  inAppName: string;

  @IsString()
  @MinLength(8)
  @MaxLength(50)
  @Matches(/^(?!.*[\u0000-\u001F\u007F]).+$/u, {
    message: 'Password contains unsupported control characters',
  })
  password: string;
}
