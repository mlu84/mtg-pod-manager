import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { TrimString } from '../../common/transformers/string.transformers';

export class AdminListFeedbackQueryDto {
  @IsOptional()
  @IsString()
  @TrimString()
  @MaxLength(200)
  @Matches(/^[\p{L}\p{N}\s@._'":;,+\-!?()[\]#%&/]*$/u, {
    message: 'Query contains invalid characters',
  })
  query?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsIn(['all', 'unread', 'read'])
  status?: 'all' | 'unread' | 'read';

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;
}

