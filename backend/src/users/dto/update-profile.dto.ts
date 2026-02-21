import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { TrimString } from '../../common/transformers/string.transformers';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[\p{L}\p{N}\s._'-]+$/u, {
    message:
      'Display name may contain letters, numbers, spaces, apostrophes, dots, underscores, and hyphens only',
  })
  @TrimString()
  inAppName?: string;
}
