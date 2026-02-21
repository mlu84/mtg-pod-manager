import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { TrimString } from '../../common/transformers/string.transformers';

export class AdminSearchGroupsQueryDto {
  @IsString()
  @IsOptional()
  @TrimString()
  @MaxLength(100)
  @Matches(/^[\p{L}\p{N}\s._'-]*$/u, {
    message:
      'Search query may contain letters, numbers, spaces, apostrophes, dots, underscores, and hyphens only',
  })
  query?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  pageSize?: number;
}
