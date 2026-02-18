import { IsOptional, IsString, MaxLength } from 'class-validator';
import { TrimString } from '../../common/transformers/string.transformers';

export class SearchInvitableUsersQueryDto {
  @IsString()
  @IsOptional()
  @TrimString()
  @MaxLength(100)
  query?: string;
}

