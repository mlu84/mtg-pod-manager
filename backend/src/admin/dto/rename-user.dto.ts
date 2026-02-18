import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { TrimString } from '../../common/transformers/string.transformers';

export class RenameUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  @TrimString()
  inAppName: string;
}
