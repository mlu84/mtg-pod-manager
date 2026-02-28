import { ArrayMaxSize, ArrayMinSize, IsArray, IsString, MaxLength } from 'class-validator';
import { TrimString } from '../../common/transformers/string.transformers';

export class AdminBulkFeedbackActionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @TrimString()
  @MaxLength(50, { each: true })
  ids!: string[];
}

