import { IsString, IsNotEmpty, MaxLength, IsOptional, IsIn } from 'class-validator';

// Kanonische MTG-Farbkombinationen
export const VALID_COLORS = [
  // Farblos
  'Colorless',
  // Mono
  'Mono-White',
  'Mono-Blue',
  'Mono-Black',
  'Mono-Red',
  'Mono-Green',
  // Allied pairs
  'Azorius',    // WU
  'Dimir',      // UB
  'Rakdos',     // BR
  'Gruul',      // RG
  'Selesnya',   // GW
  // Enemy pairs
  'Orzhov',     // WB
  'Izzet',      // UR
  'Golgari',    // BG
  'Boros',      // RW
  'Simic',      // GU
  // Shards (Allied)
  'Bant',       // GWU
  'Esper',      // WUB
  'Grixis',     // UBR
  'Jund',       // BRG
  'Naya',       // RGW
  // Wedges (Enemy)
  'Abzan',      // WBG
  'Jeskai',     // URW
  'Sultai',     // BGU
  'Mardu',      // RWB
  'Temur',      // GUR
  // Four-color
  'Growth',     // WUBG (no red)
  'Artifice',   // WUBR (no green)
  'Aggression', // UBRG (no white)
  'Altruism',   // BRGW (no blue)
  'Chaos',      // RGWU (no black)
  // Five-color
  'WUBRG',
] as const;

export const VALID_DECK_TYPES = [
  'Aggro',
  'Midrange',
  'Control',
  'Combo',
  'Tempo',
  'Prison',
  'Battlecruiser',
] as const;

export class CreateDeckDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(VALID_COLORS)
  colors: string;

  @IsString()
  @IsOptional()
  @IsIn(VALID_DECK_TYPES)
  type?: string;

  @IsString()
  @IsNotEmpty()
  groupId: string;
}
