import { describe, expect, it } from 'vitest';
import {
  getColorComboName,
  getColorGradient,
  getManaIconPath,
  getManaSymbols,
  getSortedColors,
} from './color-utils';

describe('color-utils', () => {
  it('sorts color codes in canonical WUBRG order', () => {
    expect(getSortedColors('RGW')).toEqual(['W', 'R', 'G']);
    expect(getSortedColors('Bant')).toEqual(['W', 'U', 'G']);
  });

  it('returns colorless symbol for empty color identity', () => {
    expect(getManaSymbols('colorless')).toEqual(['/assets/images/mana-c.svg']);
  });

  it('builds mono and multicolor gradients', () => {
    expect(getColorGradient('U')).toBe('#0E68AB');
    expect(getColorGradient('WR')).toContain('linear-gradient');
  });

  it('maps combo labels to human-readable names', () => {
    expect(getColorComboName('WU')).toBe('Azorius');
    expect(getColorComboName('R', true)).toBe('Mono-Red');
    expect(getColorComboName('Colorless')).toBe('Colorless');
  });

  it('resolves mana icon paths with colorless fallback', () => {
    expect(getManaIconPath('G')).toBe('/assets/images/mana-g.svg');
    expect(getManaIconPath('X')).toBe('/assets/images/mana-c.svg');
  });
});
