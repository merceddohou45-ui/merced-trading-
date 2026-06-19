import { describe, it, expect } from 'vitest';
import { updateBrokerSymbols, getBrokerSymbols, refreshBrokerSymbols, isCanonical } from '@/lib/canonicalRegistry';
import { validateAssetSymbol } from '@/lib/assets';

// Using updateBrokerSymbols to simulate registry population
describe('canonicalRegistry', () => {
  it('stores and returns broker symbols', () => {
    updateBrokerSymbols('testBroker', ['BTCUSDT', 'XAUUSD', 'INVALID$', 'btcusd']);
    const syms = getBrokerSymbols('testBroker');
    // only valid uppercase symbols remain
    expect(syms).toContain('BTCUSDT');
    expect(syms).toContain('XAUUSD');
    expect(syms).not.toContain('INVALID$');
    expect(syms).not.toContain('btcusd');
    expect(isCanonical('testBroker', 'BTCUSDT')).toBe(true);
    expect(isCanonical('testBroker', 'btcusd')).toBe(false);
  });
});
