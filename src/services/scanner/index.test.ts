import { describe, it, expect } from 'vitest';
import { updateBrokerSymbols } from '@/lib/canonicalRegistry';
import { scanAllMarkets } from '@/services/scanner';

describe('scanner ingestion validation', () => {
  it('processes only canonical valid symbols and rejects invalid ones', () => {
    updateBrokerSymbols('scanBroker', ['BTCUSDT', 'INVALID$', 'EURUSD']);
    const res = scanAllMarkets('scanBroker');
    expect(res['BTCUSDT'].symbol).toBe('BTCUSDT');
    expect(res['EURUSD'].symbol).toBe('EURUSD');
    expect(res['INVALID$'].error).toBe('invalid symbol format');
  });
});
