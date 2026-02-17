import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateEmailInviteDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(191)
  email: string;
}
