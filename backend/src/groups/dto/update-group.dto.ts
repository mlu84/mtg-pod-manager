import {
  IsString,
  MaxLength,
  IsOptional,
  IsInt,
  IsIn,
  IsDateString,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';

export class UpdateGroupDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsInt()
  @IsOptional()
  @IsIn([7, 30, 365])
  historyRetentionDays?: number;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  activeSeasonName?: string | null;

  @IsDateString()
  @IsOptional()
  activeSeasonEndsAt?: string | null;

  @IsDateString()
  @IsOptional()
  activeSeasonStartedAt?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  nextSeasonName?: string | null;

  @IsDateString()
  @IsOptional()
  nextSeasonStartsAt?: string | null;

  @IsDateString()
  @IsOptional()
  nextSeasonEndsAt?: string | null;

  @IsBoolean()
  @IsOptional()
  nextSeasonIsSuccessive?: boolean;

  @IsString()
  @IsOptional()
  @IsIn(['WEEKLY', 'BI_WEEKLY', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'])
  nextSeasonInterval?: 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY';

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(365)
  nextSeasonIntermissionDays?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(365)
  seasonPauseDays?: number;
}
