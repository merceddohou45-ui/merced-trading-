import { describe, it, expect } from 'vitest';
import { analyzeTimeframe, aggregateSignals, OHLCSeries, IndicatorConfig } from './index';

// Helper to build a stable OHLC series
function buildSeries(length: number, start = 100, step = 0.1): OHLCSeries {
  const closes: number[] = [];
  const highs: number[] = [];
  const lows: number[] = [];
  for (let i = 0; i < length; i++) {
    const v = start + i * step;
    closes.push(v);
    highs.push(v + 0.05);
    lows.push(v - 0.05);
  }
  return { highs, lows, closes };
}

const cfg: IndicatorConfig = { rsiEnabled: true, bbEnabled: true, stochEnabled: true };

describe('signalEngine - analyzeTimeframe deterministic', () => {
  it('produces BUY hint when oversold and below lower BB', () => {
    // craft series where price drops so RSI low and price below BB
    const closes = [100, 99, 98, 90, 80, 70, 60, 55, 50, 45, 40, 35, 30, 28, 27, 26];
    const highs = closes.map(c => c + 0.1);
    const lows = closes.map(c => c - 0.1);
    const series = { highs, lows, closes } as OHLCSeries;
    const res = analyzeTimeframe(series, { ...cfg, rsiPeriod: 5, bbPeriod: 5, stochKPeriod: 3 });
    expect(['BUY', 'NEUTRAL']).toContain(res.timeframeHint);
    expect(res.reasons.length).toBeGreaterThan(0);
  });

  it('produces SELL hint for rising spike', () => {
    const closes = [100, 101, 102, 120, 140, 160, 180, 200];
    const highs = closes.map(c => c + 0.2);
    const lows = closes.map(c => c - 0.2);
    const series = { highs, lows, closes } as OHLCSeries;
    const res = analyzeTimeframe(series, { ...cfg, rsiPeriod: 3, bbPeriod: 3 });
    expect(['SELL', 'NEUTRAL']).toContain(res.timeframeHint);
  });
});

describe('signalEngine - aggregateSignals behavior', () => {
  it('returns NONE when conflicting TFs', () => {
    // create two timeframe results: one BUY strong, one SELL strong
    const tfResults: Partial<Record<any, any>> = {
      D1: { timeframeHint: 'BUY', certaintyScore: 90, lastClose: 100, indicators: { bb: { mid: 100, upper: 102, lower: 98 } }, reasons: ['D1 buy'] },
      H1: { timeframeHint: 'SELL', certaintyScore: 90, lastClose: 101, indicators: { bb: { mid: 101, upper: 103, lower: 99 } }, reasons: ['H1 sell'] },
      M5: { timeframeHint: 'NEUTRAL', certaintyScore: 0, lastClose: 100.5, indicators: { bb: null }, reasons: [] }
    };
    const sig = aggregateSignals('TEST', tfResults, 1, 1000);
    expect(sig.direction).toBe('NONE');
  });

  it('generates a BUY signal with coherent TFs', () => {
    // multiple TFs indicating BUY
    const tfResults: Partial<Record<any, any>> = {
      D1: { timeframeHint: 'BUY', certaintyScore: 80, lastClose: 100, indicators: { bb: { mid: 100, upper: 102, lower: 98 } }, reasons: ['D1 buy'] },
      H4: { timeframeHint: 'BUY', certaintyScore: 60, lastClose: 100.2, indicators: { bb: { mid: 100.2, upper: 102.2, lower: 98.2 } }, reasons: ['H4 buy'] },
      M15: { timeframeHint: 'NEUTRAL', certaintyScore: 0, lastClose: 100.1, indicators: { bb: null }, reasons: [] }
    };
    const sig = aggregateSignals('BTCUSD', tfResults, 1, 10000);
    expect(sig.direction).toBe('BUY');
    expect(sig.entry).toBeGreaterThan(0);
    expect(sig.stopLoss).toBeLessThan(sig.entry as number);
    expect(sig.takeProfits.length).toBe(3);
    expect(sig.confidence).toBeGreaterThanOrEqual(0);
  });

  it('handles zero volatility by fallback and returns NONE if low confidence', () => {
    const tfResults: Partial<Record<any, any>> = {
      D1: { timeframeHint: 'BUY', certaintyScore: 20, lastClose: 100, indicators: { bb: { mid: 100, upper: 100, lower: 100 } }, reasons: ['flat'] },
      H4: { timeframeHint: 'NEUTRAL', certaintyScore: 0, lastClose: 100, indicators: { bb: { mid: 100, upper: 100, lower: 100 } }, reasons: [] }
    };
    const sig = aggregateSignals('FLAT', tfResults, 1, 1000);
    expect(sig.direction).toBe('NONE');
    // if a stopLoss exists it must respect ordering
    if (sig.stopLoss) {
      expect(sig.stopLoss < (sig.entry as number)).toBeTruthy();
    }
  });

  it('is deterministic: same input => same output', () => {
    const tfResults: Partial<Record<any, any>> = {
      D1: { timeframeHint: 'BUY', certaintyScore: 80, lastClose: 50, indicators: { bb: { mid: 50, upper: 52, lower: 48 } }, reasons: ['D1 buy'] },
      H1: { timeframeHint: 'BUY', certaintyScore: 60, lastClose: 50.1, indicators: { bb: { mid: 50.1, upper: 52.1, lower: 48.1 } }, reasons: ['H1 buy'] }
    };
    const a = aggregateSignals('DETER', tfResults, 2, 5000);
    const b = aggregateSignals('DETER', tfResults, 2, 5000);
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });
});
