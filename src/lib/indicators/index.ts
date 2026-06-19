/*
 * Deterministic, pure, and performant implementations of common indicators:
 * - SMA (Simple Moving Average)
 * - Rolling standard deviation (population)
 * - Bollinger Bands
 * - RSI (Wilder's smoothing)
 * - Stochastic %K and %D (with rolling high/low via deque for O(n))
 *
 * All functions return arrays matching the input length. When insufficient data exists
 * for the requested period the value at that index is NaN.
 */

export function sma(values: number[], period: number): number[] {
  const n = values.length;
  if (period <= 0) throw new Error('period must be > 0');
  const out = new Array<number>(n).fill(NaN);
  if (n === 0) return out;

  let sum = 0;
  for (let i = 0; i < n; i++) {
    const v = values[i];
    sum += v;
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function rollingStd(values: number[], period: number): number[] {
  // population stddev over window of `period`. Uses rolling sums for O(n).
  const n = values.length;
  if (period <= 0) throw new Error('period must be > 0');
  const out = new Array<number>(n).fill(NaN);
  if (n === 0) return out;

  let sum = 0;
  let sumsq = 0;
  for (let i = 0; i < n; i++) {
    const v = values[i];
    sum += v;
    sumsq += v * v;
    if (i >= period) {
      const old = values[i - period];
      sum -= old;
      sumsq -= old * old;
    }
    if (i >= period - 1) {
      const mean = sum / period;
      const variance = Math.max(0, sumsq / period - mean * mean);
      out[i] = Math.sqrt(variance);
    }
  }
  return out;
}

export function bollingerBands(values: number[], period = 20, stdMultiplier = 2) {
  const mid = sma(values, period);
  const sd = rollingStd(values, period);
  const n = values.length;
  const upper = new Array<number>(n).fill(NaN);
  const lower = new Array<number>(n).fill(NaN);
  for (let i = 0; i < n; i++) {
    const m = mid[i];
    const s = sd[i];
    if (Number.isFinite(m) && Number.isFinite(s)) {
      upper[i] = m + stdMultiplier * s;
      lower[i] = m - stdMultiplier * s;
    }
  }
  return { mid, upper, lower };
}

export function rsi(values: number[], period = 14): number[] {
  const n = values.length;
  const out = new Array<number>(n).fill(NaN);
  if (period <= 0) throw new Error('period must be > 0');
  if (n === 0) return out;
  if (n === 1) return out;

  // Compute first average gain/loss from first `period` intervals (period+1 values)
  let gains = 0;
  let losses = 0;
  // need at least period+1 values to compute first value at index = period
  for (let i = 1; i <= Math.min(period, n - 1); i++) {
    const delta = values[i] - values[i - 1];
    if (delta > 0) gains += delta;
    else losses += -delta;
  }
  if (n - 1 < period) {
    // not enough intervals to compute a first RSI -> return all NaN
    return out;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // First RSI corresponds to index = period
  function computeRsiFromAvgs(gA: number, lA: number) {
    if (gA === 0 && lA === 0) return 50; // no moves
    if (lA === 0) return 100;
    if (gA === 0) return 0;
    const rs = gA / lA;
    return 100 - 100 / (1 + rs);
  }

  out[period] = computeRsiFromAvgs(avgGain, avgLoss);

  // Wilder's smoothing for subsequent values
  for (let i = period + 1; i < n; i++) {
    const delta = values[i] - values[i - 1];
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? -delta : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = computeRsiFromAvgs(avgGain, avgLoss);
  }

  return out;
}

// Simple deque implementation for rolling min/max indexes
class Deque<T> {
  private data: T[] = [];
  push(val: T) { this.data.push(val); }
  pop() { return this.data.pop(); }
  shift() { return this.data.shift(); }
  unshift(val: T) { this.data.unshift(val); }
  peekFront() { return this.data[0]; }
  peekBack() { return this.data[this.data.length - 1]; }
  size() { return this.data.length; }
}

export function stochastic(highs: number[], lows: number[], closes: number[], kPeriod = 5, kSmoothing = 3, dPeriod = 3) {
  const n = closes.length;
  const kRaw = new Array<number>(n).fill(NaN);
  const kSmoothed = new Array<number>(n).fill(NaN);
  const d = new Array<number>(n).fill(NaN);
  if (kPeriod <= 0 || kSmoothing <= 0 || dPeriod <= 0) throw new Error('periods must be > 0');
  if (highs.length !== n || lows.length !== n) throw new Error('highs, lows, closes must have same length');
  if (n === 0) return { k: kSmoothed, d };

  // Rolling highest high and lowest low using deque of indexes for O(n)
  const maxDeque = new Deque<number>();
  const minDeque = new Deque<number>();

  for (let i = 0; i < n; i++) {
    // maintain maxDeque for highs
    while (maxDeque.size() && highs[maxDeque.peekBack() as number] <= highs[i]) maxDeque.pop();
    maxDeque.push(i);
    while (minDeque.size() && lows[minDeque.peekBack() as number] >= lows[i]) minDeque.pop();
    minDeque.push(i);

    // remove indexes outside window
    const windowStart = i - kPeriod + 1;
    while (maxDeque.size() && (maxDeque.peekFront() as number) < windowStart) maxDeque.shift();
    while (minDeque.size() && (minDeque.peekFront() as number) < windowStart) minDeque.shift();

    if (i >= kPeriod - 1) {
      const highestHigh = highs[maxDeque.peekFront() as number];
      const lowestLow = lows[minDeque.peekFront() as number];
      const denom = highestHigh - lowestLow;
      kRaw[i] = denom === 0 ? 50 : ((closes[i] - lowestLow) / denom) * 100;
    }
  }

  // Smooth %K using SMA over kSmoothing
  // Reuse sma implementation but ensure NaN handling: sma treats values normally; we provide kRaw with NaNs where insufficient
  function smaArray(vals: number[], p: number) {
    const out = new Array<number>(n).fill(NaN);
    let sum = 0;
    let count = 0;
    // We'll treat NaN in vals as zero but mark output NaN if any NaN in window (so behavior aligns with indicator expectations)
    // Simpler: compute SMA only when all values in window are finite
    for (let i = 0; i < n; i++) {
      if (Number.isFinite(vals[i])) {
        sum += vals[i];
        count++;
      } else {
        // mark by incrementing count but also track presence
        // We'll use a sliding approach checking every window
        // For simplicity compute window explicitly when i>=p-1
      }
      if (i >= p) {
        // subtract leaving element if finite
        if (Number.isFinite(vals[i - p])) { sum -= vals[i - p]; count--; }
      }
      if (i >= p - 1) {
        // window indices [i-p+1 .. i]
        let valid = true;
        for (let j = i - p + 1; j <= i; j++) {
          if (!Number.isFinite(vals[j])) { valid = false; break; }
        }
        if (valid) out[i] = sum / p; else out[i] = NaN;
      }
    }
    return out;
  }

  const kTemp = smaArray(kRaw, kSmoothing);
  for (let i = 0; i < n; i++) {
    kSmoothed[i] = Number.isFinite(kTemp[i]) ? kTemp[i] : NaN;
  }

  // %D is SMA of kSmoothed over dPeriod
  const dTemp = smaArray(kSmoothed, dPeriod);
  for (let i = 0; i < n; i++) d[i] = Number.isFinite(dTemp[i]) ? dTemp[i] : NaN;

  return { k: kSmoothed, d };
}
