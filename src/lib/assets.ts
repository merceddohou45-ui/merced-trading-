import { getBrokerSymbols } from './canonicalRegistry';
import { validateAssetSymbol } from './validation';

export function getAvailableAssets(broker: string, marketType: string): string[] {
  const symbols = getBrokerSymbols(broker);
  return symbols.filter((s) => validateAssetSymbol(s));
}
