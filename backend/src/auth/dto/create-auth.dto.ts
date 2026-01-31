import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class CreateAuthDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(3)
  @MaxLength(20)
  inAppName: string;

  @IsString()
  @MinLength(8)
  @MaxLength(50)
  password: string;
}
