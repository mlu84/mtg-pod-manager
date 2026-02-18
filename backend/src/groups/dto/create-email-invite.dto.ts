import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';
import { NormalizeEmail } from '../../common/transformers/string.transformers';

export class CreateEmailInviteDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(191)
  @NormalizeEmail()
  email: string;
}
