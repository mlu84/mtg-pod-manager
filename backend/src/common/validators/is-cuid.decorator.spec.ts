import { describe, expect, it } from 'vitest';
import { validateSync } from 'class-validator';
import { IsCuid } from './is-cuid.decorator';

class CuidDto {
  @IsCuid()
  id!: string;
}

describe('IsCuid decorator', () => {
  it('accepts valid cuid values', () => {
    const dto = new CuidDto();
    dto.id = 'clm6q6tdv0000jv08x8g5nq2z';

    const errors = validateSync(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects invalid cuid values', () => {
    const dto = new CuidDto();
    dto.id = 'invalid-id';

    const errors = validateSync(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toMatchObject({
      isCuid: 'id must be a valid CUID',
    });
  });
});
