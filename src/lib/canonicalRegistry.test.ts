import { describe, it, expect, beforeEach } from 'vitest';
import { refreshBrokerSymbols, updateBrokerSymbols, getBrokerSymbols } from '@/lib/canonicalRegistry';
import { prisma } from '@/lib/prisma';

beforeEach(async () => {
  // clean table before each test
  await prisma.brokerSymbol.deleteMany();
});

describe('canonicalRegistry persistence & upsert behavior (Postgres)', () => {
  it('persists symbols across refresh and update cycles', async () => {
    // simulate initial population
    await updateBrokerSymbols('test', ['BTCUSDT', 'XAUUSD']);
    let syms = await getBrokerSymbols('test');
    expect(syms).toContain('BTCUSDT');
    expect(syms).toContain('XAUUSD');

    // simulate refresh with changed set
    await updateBrokerSymbols('test', ['XAUUSD', 'EURUSD']);
    syms = await getBrokerSymbols('test');
    // BTCUSDT should be marked inactive
    expect(syms).not.toContain('BTCUSDT');
    expect(syms).toContain('XAUUSD');
    expect(syms).toContain('EURUSD');
  });

  it('marks missing symbols inactive on refresh', async () => {
    await updateBrokerSymbols('t2', ['A', 'B', 'C']);
    await updateBrokerSymbols('t2', ['B', 'D']);
    const syms = await getBrokerSymbols('t2');
    expect(syms).toContain('B');
    expect(syms).toContain('D');
    expect(syms).not.toContain('A');
    expect(syms).not.toContain('C');
  });
});
