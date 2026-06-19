import { getBrokerSymbols } from './canonicalRegistry';
import { validateAssetSymbol } from './assets';

export function getAvailableAssets(broker: string, marketType: string): string[] {
  // marketType currently unused here; broker registry may include marketType in future
  const symbols = getBrokerSymbols(broker);
  return symbols.filter((s) => validateAssetSymbol(s));
}

export const SYMBOL_REGEX = /^[A-Z0-9]{3,12}$/; // conservative: uppercase letters and digits, 3-12 chars

export function validateAssetSymbol(symbol: string): boolean {
  if (!symbol || typeof symbol !== 'string') return false;
  return SYMBOL_REGEX.test(symbol);
}
