import { IsString, MaxLength, IsOptional, IsInt, IsIn, IsDateString, Min, Max } from 'class-validator';

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
  activeSeasonName?: string;

  @IsDateString()
  @IsOptional()
  activeSeasonEndsAt?: string;

  @IsDateString()
  @IsOptional()
  activeSeasonStartedAt?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(365)
  seasonPauseDays?: number;

}
