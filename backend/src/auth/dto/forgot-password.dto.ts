import { IsEmail, MaxLength } from 'class-validator';
import { NormalizeEmail } from '../../common/transformers/string.transformers';

export class ForgotPasswordDto {
  @IsEmail()
  @MaxLength(191)
  @NormalizeEmail()
  email: string;
}
