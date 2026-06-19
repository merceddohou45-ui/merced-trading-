import { describe, it, expect } from 'vitest';
import { sma, rollingStd, bollingerBands, rsi, stochastic } from './index';

describe('indicators - SMA', () => {
  it('returns empty array for empty input', () => {
    expect(sma([], 3)).toEqual([]);
  });

  it('throws on invalid period', () => {
    expect(() => sma([1, 2, 3], 0)).toThrow('sma: period must be > 0');
  });

  it('computes SMA correctly', () => {
    const vals = [1, 2, 3, 4, 5];
    const out = sma(vals, 3);
    expect(out.length).toBe(vals.length);
    expect(Number.isNaN(out[0])).toBeTruthy();
    expect(Number.isNaN(out[1])).toBeTruthy();
    expect(out[2]).toBeCloseTo(2);
    expect(out[3]).toBeCloseTo(3);
    expect(out[4]).toBeCloseTo(4);
  });
});

describe('indicators - rollingStd', () => {
  it('handles empty input', () => {
    expect(rollingStd([], 3)).toEqual([]);
  });

  it('computes stddev for constant series (zero)', () => {
    const vals = [5, 5, 5, 5, 5];
    const out = rollingStd(vals, 3);
    expect(Number.isNaN(out[0])).toBeTruthy();
    expect(Number.isNaN(out[1])).toBeTruthy();
    expect(out[2]).toBeCloseTo(0);
    expect(out[3]).toBeCloseTo(0);
    expect(out[4]).toBeCloseTo(0);
  });
});

describe('indicators - Bollinger Bands', () => {
  it('returns mid/upper/lower arrays', () => {
    const vals = [1,2,3,4,5,6,7,8,9,10];
    const { mid, upper, lower } = bollingerBands(vals, 3, 2);
    expect(mid.length).toBe(vals.length);
    expect(upper.length).toBe(vals.length);
    expect(lower.length).toBe(vals.length);
    expect(Number.isNaN(mid[0])).toBeTruthy();
  });
});

describe('indicators - RSI', () => {
  it('returns NaN when not enough data', () => {
    const out = rsi([1,2,3], 14);
    expect(out.every(x => Number.isNaN(x))).toBeTruthy();
  });

  it('produces values in [0,100]', () => {
    // create a series with increasing values
    const arr = Array.from({length: 30}, (_, i) => i + 1);
    const out = rsi(arr, 14);
    for (let i = 14; i < out.length; i++) {
      expect(out[i]).toBeGreaterThanOrEqual(0);
      expect(out[i]).toBeLessThanOrEqual(100);
    }
  });

  it('handles constant series (returns 50)', () => {
    const arr = Array.from({length: 20}, () => 100);
    const out = rsi(arr, 14);
    expect(Number.isNaN(out[13])).toBeTruthy();
    // first computed RSI at index 14
    expect(out[14]).toBe(50);
    for (let i = 14; i < out.length; i++) expect(out[i]).toBe(50);
  });
});

describe('indicators - Stochastic', () => {
  it('returns k and d arrays same length', () => {
    const n = 30;
    const highs = Array.from({length: n}, (_, i) => i + 1);
    const lows = Array.from({length: n}, (_, i) => i);
    const closes = Array.from({length: n}, (_, i) => i + 0.5);
    const { k, d } = stochastic(highs, lows, closes, 5, 3, 3);
    expect(k.length).toBe(n);
    expect(d.length).toBe(n);
  });

  it('throws when arrays lengths mismatch', () => {
    expect(() => stochastic([1,2], [1], [1,2])).toThrow('stochastic: highs, lows, closes must have the same length');
  });
});

// Additional edge-case tests

describe('indicators - Edge cases and performance sanity', () => {
  it('handles extremely large datasets (performance sanity)', () => {
    const n = 10000;
    const vals = new Array<number>(n).fill(0).map((_, i) => Math.sin(i / 10) + i * 0.0001);
    const start = Date.now();
    const mid = sma(vals, 14);
    const sd = rollingStd(vals, 14);
    const bb = bollingerBands(vals, 14, 2);
    const end = Date.now();
    const duration = end - start;
    // Should complete reasonably fast (tunable threshold)
    expect(mid.length).toBe(n);
    expect(sd.length).toBe(n);
    expect(bb.mid.length).toBe(n);
    expect(duration).toBeLessThan(5000);
  }, 10000);

  it('flat market scenario: constant prices', () => {
    const n = 200;
    const price = 123.45;
    const vals = new Array<number>(n).fill(price);
    const highs = new Array<number>(n).fill(price);
    const lows = new Array<number>(n).fill(price);
    const mid = sma(vals, 14);
    const sd = rollingStd(vals, 14);
    const bb = bollingerBands(vals, 14, 2);
    const r = rsi(vals, 14);
    // after warmup, mid equals the constant price, std == 0, RSI == 50
    expect(mid[n - 1]).toBeCloseTo(price);
    expect(sd[n - 1]).toBeCloseTo(0);
    expect(bb.mid[n - 1]).toBeCloseTo(price);
    expect(bb.upper[n - 1]).toBeCloseTo(price);
    expect(bb.lower[n - 1]).toBeCloseTo(price);
    expect(r[n - 1]).toBe(50);
  });

  it('spike and drop detection scenarios', () => {
    const base = 100;
    // build a series with stable price then a spike
    const valsSpike = new Array<number>(30).fill(base);
    valsSpike.push(base * 5); // sudden spike
    // use small RSI period to detect quickly
    const rSpike = rsi(valsSpike, 5);
    expect(rSpike[rSpike.length - 1]).toBeGreaterThan(70);

    // now a sudden drop
    const valsDrop = new Array<number>(30).fill(base);
    valsDrop.push(base * 0.2); // sudden drop
    const rDrop = rsi(valsDrop, 5);
    expect(rDrop[rDrop.length - 1]).toBeLessThan(30);
  });
});
