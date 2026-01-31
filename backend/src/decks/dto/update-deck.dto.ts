import { IsString, MaxLength, IsOptional, IsIn, IsBoolean } from 'class-validator';
import { VALID_COLORS, VALID_DECK_TYPES } from './create-deck.dto';

export class UpdateDeckDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @IsIn(VALID_COLORS)
  colors?: string;

  @IsString()
  @IsOptional()
  @IsIn(VALID_DECK_TYPES)
  type?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
