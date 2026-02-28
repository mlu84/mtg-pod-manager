import { IsEmail, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { NormalizeEmail, TrimString } from '../../common/transformers/string.transformers';

export class CreateFeedbackDto {
  @IsString()
  @TrimString()
  @MinLength(3)
  @MaxLength(4000)
  text!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  @TrimString()
  @NormalizeEmail()
  @IsEmail()
  @MaxLength(254)
  contactEmail?: string;
}

