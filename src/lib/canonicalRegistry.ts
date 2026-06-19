import { fetchSymbols } from '@/services/brokers';
import { validateAssetSymbol } from '@/lib/assets';

// In-memory canonical registry. For production persist in DB.
const registry = new Map<string, string[]>(); // key: broker (lowercase) -> symbols array

export async function refreshBrokerSymbols(broker: string): Promise<string[]> {
  const symbols = await fetchSymbols(broker);
  // enforce validation: keep only symbols that pass validateAssetSymbol
  const clean = symbols.filter((s) => validateAssetSymbol(s));
  registry.set(broker.toLowerCase(), Array.from(new Set(clean))); // dedupe
  return registry.get(broker.toLowerCase()) || [];
}

export function updateBrokerSymbols(broker: string, symbols: string[]) {
  const clean = (symbols || []).filter((s) => validateAssetSymbol(s));
  registry.set(broker.toLowerCase(), Array.from(new Set(clean)));
}

export function getBrokerSymbols(broker: string): string[] {
  return registry.get(broker.toLowerCase()) || [];
}

export function isCanonical(broker: string, symbol: string): boolean {
  const arr = registry.get(broker.toLowerCase());
  if (!arr) return false;
  return arr.includes(symbol);
}
