import { IsString, IsNotEmpty } from 'class-validator';

export class JoinGroupDto {
  @IsString()
  @IsNotEmpty()
  inviteCode: string;
}
