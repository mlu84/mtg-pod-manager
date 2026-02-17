import { IsNotEmpty, IsString } from 'class-validator';

export class CreateUserInviteDto {
  @IsString()
  @IsNotEmpty()
  targetUserId: string;
}
