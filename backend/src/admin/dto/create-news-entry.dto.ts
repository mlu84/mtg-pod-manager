import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateNewsEntryDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(8000)
  content!: string;
}
