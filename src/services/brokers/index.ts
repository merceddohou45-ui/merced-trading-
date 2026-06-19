import { fetchBinanceSymbols } from './binance';
import { fetchBybitSymbols } from './bybit';

export async function fetchSymbols(broker: string): Promise<string[]> {
  const b = (broker || '').toLowerCase();
  switch (b) {
    case 'binance':
      return await fetchBinanceSymbols();
    case 'bybit':
      return await fetchBybitSymbols();
    default:
      // Unsupported broker: return empty list
      return [];
  }
}
