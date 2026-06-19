import { describe, it, expect } from 'vitest';
import { getAvailableAssets, validateAssetSymbol, SYMBOL_REGEX } from './assets';

describe('assets - validateAssetSymbol', () => {
  it('accepts valid symbols', () => {
    const valid = ['XAUUSD', 'BTCUSDT', 'EURUSD', 'NAS100', 'GBPUSD'];
    for (const s of valid) expect(validateAssetSymbol(s)).toBe(true);
  });

  it('rejects friendly names or invalid formats', () => {
    const invalid = ['Gold', 'Bitcoin', 'Euro', 'BTC/USDT', 'btcUSDT', 'EUR USD', '', 'US$', 'A'];
    for (const s of invalid) expect(validateAssetSymbol(s)).toBe(false);
  });

  it('SYMBOL_REGEX is strict', () => {
    expect(SYMBOL_REGEX.test('XAUUSD')).toBe(true);
    expect(SYMBOL_REGEX.test('BTC/USDT')).toBe(false);
  });
});

describe('assets - getAvailableAssets', () => {
  it('returns only raw symbols for known brokers', () => {
    const binanceSpot = getAvailableAssets('binance', 'spot');
    expect(binanceSpot.length).toBeGreaterThan(0);
    for (const s of binanceSpot) expect(validateAssetSymbol(s)).toBe(true);

    const oandaMetals = getAvailableAssets('oanda', 'metals');
    expect(oandaMetals).toContain('XAUUSD');
    for (const s of oandaMetals) expect(validateAssetSymbol(s)).toBe(true);
  });

  it('returns empty list for unknown broker or market', () => {
    expect(getAvailableAssets('unknown-broker', 'crypto')).toEqual([]);
    expect(getAvailableAssets('binance', 'unknown-market')).toEqual([]);
  });
});
