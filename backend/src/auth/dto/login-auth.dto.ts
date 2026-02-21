import { IsEmail, IsString, Matches, MinLength, MaxLength } from 'class-validator';
import { NormalizeEmail } from '../../common/transformers/string.transformers';

export class LoginAuthDto {
  @IsEmail()
  @MaxLength(191)
  @NormalizeEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(50)
  @Matches(/^(?!.*[\u0000-\u001F\u007F]).+$/u, {
    message: 'Password contains unsupported control characters',
  })
  password: string;
}
