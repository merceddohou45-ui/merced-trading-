export const SYMBOL_REGEX = /^[A-Z0-9]{3,12}$/; // uppercase letters and digits, 3-12 chars

export function validateAssetSymbol(symbol: string): boolean {
  if (!symbol || typeof symbol !== 'string') return false;
  return SYMBOL_REGEX.test(symbol);
}
