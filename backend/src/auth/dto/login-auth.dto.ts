import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { NormalizeEmail } from '../../common/transformers/string.transformers';

export class LoginAuthDto {
  @IsEmail()
  @NormalizeEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(50)
  password: string;
}
