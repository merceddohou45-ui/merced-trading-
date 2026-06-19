import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchSymbols } from './index';
import * as binance from './binance';
import * as bybit from './bybit';

// Mock fetch for adapters by stubbing the adapter implementations
describe('brokers fetchSymbols adapters (mocked)', () => {
  it('uses binance adapter when broker is binance', async () => {
    const spy = vi.spyOn(binance, 'fetchBinanceSymbols').mockResolvedValue(['BTCUSDT', 'ETHUSDT']);
    const res = await fetchSymbols('binance');
    expect(res).toEqual(['BTCUSDT', 'ETHUSDT']);
    spy.mockRestore();
  });

  it('uses bybit adapter when broker is bybit', async () => {
    const spy = vi.spyOn(bybit, 'fetchBybitSymbols').mockResolvedValue(['BTCUSDT', 'XRPUSDT']);
    const res = await fetchSymbols('bybit');
    expect(res).toEqual(['BTCUSDT', 'XRPUSDT']);
    spy.mockRestore();
  });

  it('returns empty for unknown broker', async () => {
    const res = await fetchSymbols('unknown');
    expect(res).toEqual([]);
  });
});
