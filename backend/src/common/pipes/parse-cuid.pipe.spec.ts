import { describe, expect, it } from 'vitest';
import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { ParseCuidPipe } from './parse-cuid.pipe';

describe('ParseCuidPipe', () => {
  const pipe = new ParseCuidPipe();
  const paramMetadata: ArgumentMetadata = {
    type: 'param',
    data: 'groupId',
    metatype: String,
  };

  it('passes a valid cuid value', () => {
    const valid = 'clm6q6tdv0000jv08x8g5nq2z';
    expect(pipe.transform(valid, paramMetadata)).toBe(valid);
  });

  it('rejects non-cuid values', () => {
    expect(() => pipe.transform('not-a-cuid', paramMetadata)).toThrow(BadRequestException);
    expect(() => pipe.transform('12345', paramMetadata)).toThrow(BadRequestException);
  });
});
