import { describe, expect, it } from 'vitest';
import { resolveSearchPagination } from './groups-query.util';

describe('resolveSearchPagination', () => {
  it('uses defaults for invalid values', () => {
    expect(resolveSearchPagination(undefined, undefined)).toEqual({
      page: 1,
      pageSize: 10,
    });
    expect(resolveSearchPagination(0, -1)).toEqual({
      page: 1,
      pageSize: 10,
    });
  });

  it('caps page size at 20', () => {
    expect(resolveSearchPagination(2, 99)).toEqual({
      page: 2,
      pageSize: 20,
    });
  });
});

