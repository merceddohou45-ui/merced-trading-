// assets.ts
// Utilities for enforcing and returning raw broker symbols only.
// No friendly names or aliases are provided here — only raw exchange symbols.

export const SYMBOL_REGEX = /^[A-Z0-9]{3,12}$/; // conservative: uppercase letters and digits, 3-12 chars

export function validateAssetSymbol(symbol: string): boolean {
  if (!symbol || typeof symbol !== 'string') return false;
  return SYMBOL_REGEX.test(symbol);
}

// Returns raw broker symbols for known brokers and market types.
// This is intentionally a whitelist of common tradable symbols. Do NOT include friendly names.
export function getAvailableAssets(broker: string, marketType: string): string[] {
  const b = (broker || '').toLowerCase();
  const m = (marketType || '').toLowerCase();

  // Example lists. In production, this should be sourced from the broker's official symbol list.
  const lists: Record<string, Record<string, string[]>> = {
    binance: {
      crypto: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT'],
      futures: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'],
      spot: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'],
    },
    oanda: {
      forex: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD'],
      metals: ['XAUUSD', 'XAGUSD'],
    },
    mt: {
      forex: ['EURUSD', 'GBPUSD', 'USDJPY'],
      indices: ['NAS100', 'US30', 'DE30'],
    },
    generic: {
      crypto: ['BTCUSDT', 'ETHUSDT'],
      forex: ['EURUSD', 'GBPUSD'],
      metals: ['XAUUSD'],
      indices: ['NAS100'],
    }
  };

  if (lists[b] && lists[b][m]) return lists[b][m].filter(validateAssetSymbol);

  // Fallback: if marketType known in generic list, return that
  if (lists['generic'][m]) return lists['generic'][m].filter(validateAssetSymbol);

  // Unknown broker/market: return an empty list (do not attempt aliasing)
  return [];
}
