import { IsString, MaxLength, IsOptional, IsIn, IsBoolean } from 'class-validator';
import { VALID_COLORS, VALID_DECK_TYPES } from './create-deck.dto';
import { TrimString } from '../../common/transformers/string.transformers';
import { IsCuid } from '../../common/validators/is-cuid.decorator';

export class UpdateDeckDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  @TrimString()
  name?: string;

  @IsString()
  @IsOptional()
  @IsIn(VALID_COLORS)
  @TrimString()
  colors?: string;

  @IsString()
  @IsOptional()
  @IsIn(VALID_DECK_TYPES)
  @TrimString()
  type?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  @TrimString()
  archidektUrl?: string; // URL oder ID des Archidekt-Decks (leer = entfernen)

  @IsString()
  @IsOptional()
  @IsCuid()
  @TrimString()
  ownerId?: string;
}
