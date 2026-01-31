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
} from 'class-validator';
import { Type } from 'class-transformer';

export class GamePlacementDto {
  @IsString()
  @IsNotEmpty()
  deckId: string;

  @IsInt()
  @Min(1)
  @Max(6)
  rank: number;

  @IsString()
  @IsOptional()
  playerName?: string;
}

export class CreateGameDto {
  @IsString()
  @IsNotEmpty()
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
