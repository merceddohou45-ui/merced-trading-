/**
 * Minimal, self-contained signal engine.
 * Clean production-ready version (no merge artifacts).
 */

import { prisma } from '@/lib/prisma';
import * as indicators from '@/lib/indicators';

type Candle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

type OHLC = {
  opens: number[];
  highs: number[];
  lows: number[];
  closes: number[];
  volumes: number[];
  timestamps: number[];
};

type SignalDecision = {
  direction: 'BUY' | 'SELL' | 'NONE';
  confidence: number;
  entry: number | null;
  stopLoss: number | null;
  takeProfits: number[];
  riskPct: number;
  reasons: string[];
};

/* -----------------------------
   FETCH MARKET DATA (BINANCE)
------------------------------ */

async function fetchBinanceKlines(
  symbol: string,
  timeframe = '1m',
  limit = 200
): Promise<Candle[]> {
  const url = `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(timeframe)}&limit=${limit}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Binance fetch failed: ${res.status}`);
  }

  const data = await res.json();

  return data.map((k: any) => ({
    t: Number(k[0]),
    o: Number(k[1]),
    h: Number(k[2]),
    l: Number(k[3]),
    c: Number(k[4]),
    v: Number(k[5]),
  }));
}

async function fetchHistoricalOhlcv(
  broker: string,
  symbol: string,
  timeframe = '1m',
  limit = 200
): Promise<Candle[]> {
  try {
    if (broker.toLowerCase() === 'binance') {
      return await fetchBinanceKlines(symbol, timeframe, limit);
    }
    return [];
  } catch (err) {
    console.error('fetchHistoricalOhlcv error:', err);
    return [];
  }
}

/* -----------------------------
   SYNTHETIC FALLBACK
------------------------------ */

function syntheticCandles(base = 100, count = 200): Candle[] {
  const out: Candle[] = [];
  let price = base;
  const now = Date.now();
  const step = 60000;

  for (let i = count - 1; i >= 0; i--) {
    const t = now - i * step;
    const seed = i * 999;
const pseudo = Math.sin(seed) * 10000;
const delta = (pseudo - Math.floor(pseudo)) * base * 0.002;

    const open = price;
    const close = price + delta;
    const high = Math.max(open, close);
    const low = Math.min(open, close);

    out.push({
      t,
      o: open,
      h: high,
      l: low,
      c: close,
      v: Math.random() * 10,
    });

    price = close;
  }

  return out;
}

/* -----------------------------
   INDICATORS
------------------------------ */

function toOhlc(candles: Candle[]): OHLC {
  return {
    opens: candles.map(c => c.o),
    highs: candles.map(c => c.h),
    lows: candles.map(c => c.l),
    closes: candles.map(c => c.c),
    volumes: candles.map(c => c.v),
    timestamps: candles.map(c => c.t),
  };
}

function computeIndicators(ohlc: OHLC) {
  const closes = ohlc.closes;

  const rsiArr = indicators.rsi(closes, 14);
  const bb = indicators.bollingerBands(closes, 20, 2);

  const i = closes.length - 1;

if (i < 0) {
  return {
    lastClose: NaN,
    rsi: NaN,
    upper: NaN,
    lower: NaN,
  };
}

  return {
    lastClose: closes[i],
    rsi: rsiArr[i],
    upper: bb.upper[i],
    lower: bb.lower[i],
  };
}

/* -----------------------------
   DECISION ENGINE
------------------------------ */

function decide(ind: ReturnType<typeof computeIndicators>): SignalDecision {
  let direction: SignalDecision['direction'] = 'NONE';
  let confidence = 0;
  const reasons: string[] = [];

  if (ind.rsi < 30) {
    direction = 'BUY';
    confidence += 40;
    reasons.push('RSI oversold');
  }

  if (ind.rsi > 70) {
    direction = 'SELL';
    confidence += 40;
    reasons.push('RSI overbought');
  }

  if (ind.lastClose < ind.lower) {
    direction = 'BUY';
    confidence += 30;
    reasons.push('Below lower Bollinger');
  }

  if (ind.lastClose > ind.upper) {
    direction = 'SELL';
    confidence += 30;
    reasons.push('Above upper Bollinger');
  }

  confidence = Math.max(0, Math.min(100, confidence));

  if (direction === 'NONE') {
    return {
      direction: 'NONE',
      confidence: 0,
      entry: null,
      stopLoss: null,
      takeProfits: [],
      riskPct: 1,
      reasons,
    };
  }

  const entry = ind.lastClose;

  let stopLoss = direction === 'BUY'
    ? ind.lower || entry * 0.99
    : ind.upper || entry * 1.01;

  const range = Math.abs(entry - stopLoss);

  const takeProfits =
    direction === 'BUY'
      ? [entry + range, entry + range * 2, entry + range * 3]
      : [entry - range, entry - range * 2, entry - range * 3];

  return {
    direction,
    confidence,
    entry,
    stopLoss,
    takeProfits,
    riskPct: 1,
    reasons,
  };
}

/* -----------------------------
   DUPLICATE GUARD
------------------------------ */

async function isDuplicate(asset: string, direction: string) {
  const recent = await prisma.signal.findFirst({
    where: {
      asset,
      direction,
      createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
    },
  });

  return !!recent;
}

/* -----------------------------
   PERSISTENCE
------------------------------ */

async function persist(asset: string, timeframe: string, d: SignalDecision) {
  if (d.direction === 'NONE') return null;

  if (await isDuplicate(asset, d.direction)) return null;

  return prisma.signal.create({
    data: {
      asset,
      timeframe,
      direction: d.direction,
      entry: d.entry,
      stopLoss: d.stopLoss,
      takeProfits: d.takeProfits,
      confidence: Math.round(d.confidence),
      riskPct: d.riskPct,
      reasons: d.reasons,
    },
  });
}

/* -----------------------------
   MAIN ENTRY
------------------------------ */

export async function generateSignalForSymbol(
  broker: string,
  symbol: string,
  timeframe = '1m',
  opts: { limit?: number } = {}
) {
  try {
    let candles = await fetchHistoricalOhlcv(broker, symbol, timeframe, opts.limit ?? 200);

if (!candles || candles.length < 30) {
  console.warn('Using synthetic candles for', symbol);
  candles = syntheticCandles(100, 200);
}

if (!candles.length) return null;

    const ohlc = toOhlc(candles);
    const ind = computeIndicators(ohlc);
    const decision = decide(ind);

    if (decision.direction === 'NONE') return null;

    return await persist(symbol, timeframe, decision);
  } catch (err) {
    console.error('generateSignalForSymbol error:', err);
    return null;
  }
}

/* -----------------------------
   BATCH
------------------------------ */

export async function generateSignalsForSymbols(
  broker: string,
  symbols: string[],
  timeframe = '1m'
) {
  const results = [];

  for (const s of symbols) {
    results.push(await generateSignalForSymbol(broker, s, timeframe));
  }

  return results;
}
