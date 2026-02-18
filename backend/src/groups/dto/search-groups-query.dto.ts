import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { TrimString } from '../../common/transformers/string.transformers';

export class SearchGroupsQueryDto {
  @IsString()
  @IsOptional()
  @TrimString()
  @MaxLength(100)
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

