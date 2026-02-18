import { IsIn, IsString } from 'class-validator';
import { TrimString } from '../../common/transformers/string.transformers';

export class UpdateMemberRoleDto {
  @IsString()
  @TrimString()
  @IsIn(['ADMIN', 'MEMBER'])
  role: 'ADMIN' | 'MEMBER';
}
