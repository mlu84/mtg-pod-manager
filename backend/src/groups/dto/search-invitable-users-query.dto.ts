import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { TrimString } from '../../common/transformers/string.transformers';

export class SearchInvitableUsersQueryDto {
  @IsString()
  @IsOptional()
  @TrimString()
  @MaxLength(100)
  @Matches(/^[\p{L}\p{N}\s._'-]*$/u, {
    message:
      'Search query may contain letters, numbers, spaces, apostrophes, dots, underscores, and hyphens only',
  })
  query?: string;
}

