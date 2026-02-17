export const toImageDataUrl = (
  image: Buffer | null | undefined,
  mime: string | null | undefined,
): string | null => {
  if (!image || !mime) return null;
  const base64 = image.toString('base64');
  return `data:${mime};base64,${base64}`;
};
