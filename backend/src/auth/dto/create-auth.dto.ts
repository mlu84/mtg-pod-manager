import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { NormalizeEmail, TrimString } from '../../common/transformers/string.transformers';

export class CreateAuthDto {
  @IsEmail()
  @NormalizeEmail()
  email: string;

  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @TrimString()
  inAppName: string;

  @IsString()
  @MinLength(8)
  @MaxLength(50)
  password: string;
}
