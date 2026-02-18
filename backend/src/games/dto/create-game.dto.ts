import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  Max,
  IsOptional,
  ArrayMinSize,
  ArrayMaxSize,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TrimString } from '../../common/transformers/string.transformers';
import { IsCuid } from '../../common/validators/is-cuid.decorator';

export class GamePlacementDto {
  @IsString()
  @IsNotEmpty()
  @IsCuid()
  @TrimString()
  deckId: string;

  @IsInt()
  @Min(1)
  @Max(6)
  rank: number;

  @IsString()
  @IsOptional()
  @TrimString()
  @MaxLength(50)
  playerName?: string;
}

export class CreateGameDto {
  @IsString()
  @IsNotEmpty()
  @IsCuid()
  @TrimString()
  groupId: string;

  @IsDateString()
  @IsOptional()
  playedAt?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GamePlacementDto)
  @ArrayMinSize(2)
  @ArrayMaxSize(6)
  placements: GamePlacementDto[];
}
