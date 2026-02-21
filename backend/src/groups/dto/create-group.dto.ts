import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { TrimString } from '../../common/transformers/string.transformers';

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[\p{L}\p{N}\s._'&()#+:-]+$/u, {
    message:
      'Group name may contain letters, numbers, spaces, apostrophes, dots, underscores, ampersands, parentheses, plus, hash, colon, and hyphens only',
  })
  @TrimString()
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^[\p{L}\p{N}\s._'&()#+:\/-]+$/u, {
    message:
      'Format may contain letters, numbers, spaces, apostrophes, dots, underscores, ampersands, parentheses, plus, hash, colon, slashes, and hyphens only',
  })
  @TrimString()
  format: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  @Matches(/^(?!.*[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]).*$/u, {
    message: 'Description contains unsupported control characters',
  })
  @TrimString()
  description?: string;
}
