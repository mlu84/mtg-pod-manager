import { IsNotEmpty, IsString } from 'class-validator';

export class RenameUserDto {
  @IsString()
  @IsNotEmpty()
  inAppName: string;
}
