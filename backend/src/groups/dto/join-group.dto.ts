import { IsString, IsNotEmpty } from 'class-validator';
import { TrimString } from '../../common/transformers/string.transformers';

export class JoinGroupDto {
  @IsString()
  @IsNotEmpty()
  @TrimString()
  inviteCode: string;
}
