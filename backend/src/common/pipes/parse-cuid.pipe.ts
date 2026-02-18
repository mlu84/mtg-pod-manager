import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { isCuid } from '../validation/cuid.util';

@Injectable()
export class ParseCuidPipe implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    if (isCuid(value)) {
      return value;
    }

    const field = metadata.data || 'id';
    throw new BadRequestException(`Invalid ${field} value`);
  }
}
