import { IsEmail } from 'class-validator';
import { NormalizeEmail } from '../../common/transformers/string.transformers';

export class ForgotPasswordDto {
  @IsEmail()
  @NormalizeEmail()
  email: string;
}
