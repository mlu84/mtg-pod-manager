export const SMARTPHONE_MAX_WIDTH = 767;
export const TABLET_MIN_WIDTH = 768;
export const TABLET_MAX_WIDTH = 1199;
export const DESKTOP_MIN_WIDTH = 1200;

export function isSmartphoneWidth(width: number): boolean {
  return width <= SMARTPHONE_MAX_WIDTH;
}

export function isCompactWidth(width: number): boolean {
  return width <= TABLET_MAX_WIDTH;
}
