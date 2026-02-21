import { IsBoolean, IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { VALID_COLORS, VALID_DECK_TYPES } from './create-deck.dto';
import { TrimString } from '../../common/transformers/string.transformers';
import { IsCuid } from '../../common/validators/is-cuid.decorator';

export class UpdateDeckDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  @Matches(/^[\p{L}\p{N}\s._'&()#+:\/-]+$/u, {
    message:
      'Deck name may contain letters, numbers, spaces, apostrophes, dots, underscores, ampersands, parentheses, plus, hash, colon, slashes, and hyphens only',
  })
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
  @MaxLength(255)
  @Matches(/^\S+$/u, { message: 'Archidekt reference must not contain spaces' })
  @TrimString()
  archidektUrl?: string; // URL oder ID des Archidekt-Decks (leer = entfernen)

  @IsString()
  @IsOptional()
  @IsCuid()
  @TrimString()
  ownerId?: string;
}
