import { getBrokerSymbols } from '@/lib/canonicalRegistry';
import { validateAssetSymbol } from '@/lib/assets';

// Scanner processes canonical symbols only. Processing function is pure and synchronous.
export function processSymbol(symbol: string) {
  // Placeholder pure processing logic; in production this would enqueue jobs or compute signals in worker.
  // For now, return a deterministic summary object for testing.
  return { symbol, processedAt: new Date(0).toISOString() };
}

export function scanAllMarkets(broker: string) {
  const symbols = getBrokerSymbols(broker);
  const results: Record<string, any> = {};
  for (const s of symbols) {
    if (!validateAssetSymbol(s)) {
      // reject invalid symbols immediately
      results[s] = { error: 'invalid symbol format' };
      continue;
    }
    results[s] = processSymbol(s);
  }
  return results;
}
