import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { TrimString } from '../../common/transformers/string.transformers';

export class JoinGroupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  @Matches(/^\S+$/, { message: 'Invite code must not contain spaces' })
  @TrimString()
  inviteCode: string;
}
