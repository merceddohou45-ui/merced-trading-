/ * indicators placeholder * /
export function sma(values: number[], period: number): number[] {
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out.push(sum / period);
    else out.push(NaN);
  }
  return out;
}

export function stddev(values: number[], period: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      out.push(NaN);
      continue;
    }
    const slice = values.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
    out.push(Math.sqrt(variance));
  }
  return out;
}

export function bollingerBands(values: number[], period = 20, stdMultiplier = 2) {
  const mid = sma(values, period);
  const sd = stddev(values, period);
  const upper = mid.map((m, i) => (isFinite(m) && isFinite(sd[i]) ? m + stdMultiplier * sd[i] : NaN));
  const lower = mid.map((m, i) => (isFinite(m) && isFinite(sd[i]) ? m - stdMultiplier * sd[i] : NaN));
  return { mid, upper, lower };
}

export function rsi(values: number[], period = 14): number[] {
  const out: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i === 0) { out.push(NaN); continue; }
    if (i < period) { out.push(NaN); continue; }
    const slice = values.slice(i - period, i + 1);
    let gains = 0, losses = 0;
    for (let j = 1; j < slice.length; j++) {
      const d = slice[j] - slice[j - 1];
      if (d > 0) gains += d; else losses += Math.abs(d);
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    out.push(100 - 100 / (1 + rs));
  }
  return out;
}

export function stochastic(highs: number[], lows: number[], closes: number[], kPeriod = 5, kSmoothing = 3, dPeriod = 3) {
  const kRaw: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < kPeriod - 1) { kRaw.push(NaN); continue; }
    const lowSlice = lows.slice(i - kPeriod + 1, i + 1);
    const highSlice = highs.slice(i - kPeriod + 1, i + 1);
    const lowestLow = Math.min(...lowSlice);
    const highestHigh = Math.max(...highSlice);
    const denom = highestHigh - lowestLow;
    kRaw.push(denom === 0 ? 50 : ((closes[i] - lowestLow) / denom) * 100);
  }
  // simple SMA function reuse
  const smooth = (arr: number[], p: number) => {
    const out: number[] = [];
    for (let i = 0; i < arr.length; i++) {
      if (i < p - 1) { out.push(NaN); continue; }
      const s = arr.slice(i - p + 1, i + 1).reduce((a, b) => a + b, 0);
      out.push(s / p);
    }
    return out;
  };
  const kSmoothed = smooth(kRaw.map(v => isNaN(v) ? 0 : v), kSmoothing).map((v, i) => isNaN(kRaw[i]) ? NaN : v);
  const d = smooth(kSmoothed.map(v => isNaN(v) ? 0 : v), dPeriod).map((v, i) => isNaN(kSmoothed[i]) ? NaN : v);
  return { k: kSmoothed, d };
}
