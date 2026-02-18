const COLOR_ORDER = ['W', 'U', 'B', 'R', 'G'];

const MTG_COLORS: Record<string, string> = {
  W: '#F9FAF4',
  U: '#0E68AB',
  B: '#150B00',
  R: '#D3202A',
  G: '#00733E',
};

const COLOR_NAME_MAPPING: Record<string, string> = {
  colorless: '',
  'mono-white': 'W',
  'mono-blue': 'U',
  'mono-black': 'B',
  'mono-red': 'R',
  'mono-green': 'G',
  azorius: 'WU',
  dimir: 'UB',
  rakdos: 'BR',
  gruul: 'RG',
  selesnya: 'GW',
  orzhov: 'WB',
  izzet: 'UR',
  golgari: 'BG',
  boros: 'RW',
  simic: 'GU',
  bant: 'GWU',
  esper: 'WUB',
  grixis: 'UBR',
  jund: 'BRG',
  naya: 'RGW',
  abzan: 'WBG',
  jeskai: 'URW',
  sultai: 'UBG',
  mardu: 'RWB',
  temur: 'GUR',
  growth: 'GWUB',
  artifice: 'WUBR',
  aggression: 'UBRG',
  altruism: 'RGWU',
  chaos: 'BRGW',
  wubrg: 'WUBRG',
};

const COMBO_NAME_MAP: Record<string, string> = {
  WU: 'Azorius',
  UB: 'Dimir',
  BR: 'Rakdos',
  RG: 'Gruul',
  WG: 'Selesnya',
  WB: 'Orzhov',
  UR: 'Izzet',
  BG: 'Golgari',
  WR: 'Boros',
  UG: 'Simic',
  WUB: 'Esper',
  UBR: 'Grixis',
  BRG: 'Jund',
  WRG: 'Naya',
  WUG: 'Bant',
  WBG: 'Abzan',
  WUR: 'Jeskai',
  UBG: 'Sultai',
  WBR: 'Mardu',
  URG: 'Temur',
  WUBR: 'Yore-Tiller',
  UBRG: 'Glint-Eye',
  WBRG: 'Dune-Brood',
  WURG: 'Ink-Treader',
  WUBG: 'Witch-Maw',
  WUBRG: 'Five-color',
};

export function getSortedColors(colors: string): string[] {
  const lowerColors = colors.toLowerCase();
  const mappedColors = COLOR_NAME_MAPPING[lowerColors];
  if (mappedColors !== undefined) {
    const colorChars = mappedColors.toUpperCase().split('');
    return COLOR_ORDER.filter((c) => colorChars.includes(c));
  }

  const colorChars = colors.toUpperCase().split('');
  return COLOR_ORDER.filter((c) => colorChars.includes(c));
}

export function getColorGradient(colors: string): string {
  const sortedColors = getSortedColors(colors);
  if (sortedColors.length === 0) {
    return '#A8A495';
  }
  if (sortedColors.length === 1) {
    return MTG_COLORS[sortedColors[0]];
  }

  const stops = sortedColors.map((color, index) => {
    const percentage = (index / (sortedColors.length - 1)) * 100;
    return `${MTG_COLORS[color]} ${percentage}%`;
  });
  return `linear-gradient(to right, ${stops.join(', ')})`;
}

export function getManaSymbols(colors: string): string[] {
  const sortedColors = getSortedColors(colors);
  if (sortedColors.length === 0) {
    return ['/assets/images/mana-c.svg'];
  }
  return sortedColors.map((c) => getManaIconPath(c));
}

export function getManaIconPath(color: string): string {
  const key = color.toUpperCase();
  const map: Record<string, string> = {
    W: '/assets/images/mana-w.svg',
    U: '/assets/images/mana-u.svg',
    B: '/assets/images/mana-b.svg',
    R: '/assets/images/mana-r.svg',
    G: '/assets/images/mana-g.svg',
    C: '/assets/images/mana-c.svg',
  };
  return map[key] || map['C'];
}

export function getColorComboName(label: string, monoPrefixSingles = false): string {
  const normalized = label.replace(/\s+/g, '').toUpperCase();
  if (normalized === 'COLORLESS' || normalized === 'C') return 'Colorless';

  const colorLetters = normalized.replace(/[^WUBRG]/g, '');
  const sortedLetters =
    colorLetters.length > 0
      ? COLOR_ORDER.filter((c) => colorLetters.includes(c)).join('')
      : normalized;

  const monoMap: Record<string, string> = {
    W: monoPrefixSingles ? 'Mono-White' : 'White',
    U: monoPrefixSingles ? 'Mono-Blue' : 'Blue',
    B: monoPrefixSingles ? 'Mono-Black' : 'Black',
    R: monoPrefixSingles ? 'Mono-Red' : 'Red',
    G: monoPrefixSingles ? 'Mono-Green' : 'Green',
  };
  if (monoMap[sortedLetters]) return monoMap[sortedLetters];
  return COMBO_NAME_MAP[sortedLetters] || label;
}
