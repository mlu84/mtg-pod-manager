import { IsNotEmpty, IsString } from 'class-validator';
import { TrimString } from '../../common/transformers/string.transformers';
import { IsCuid } from '../../common/validators/is-cuid.decorator';

export class CreateUserInviteDto {
  @IsString()
  @IsNotEmpty()
  @IsCuid()
  @TrimString()
  targetUserId: string;
}
