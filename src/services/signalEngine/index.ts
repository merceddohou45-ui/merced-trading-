import { bollingerBands, rsi as computeRsi, stochastic as computeStochastic, rollingStd } from '@/lib/indicators';

export type Timeframe = 'M1' | 'M5' | 'M15' | 'M30' | 'H1' | 'H4' | 'D1';

export interface OHLCSeries {
  opens?: number[];
  highs: number[];
  lows: number[];
  closes: number[];
  volumes?: number[];
}

export interface IndicatorConfig {
  rsiEnabled: boolean;
  bbEnabled: boolean;
  stochEnabled: boolean;
  rsiPeriod?: number;
  bbPeriod?: number;
  bbStdMultiplier?: number;
  stochKPeriod?: number;
  stochKSmoothing?: number;
  stochDPeriod?: number;
}

export interface TimeframeResult {
  timeframeHint: 'BUY' | 'SELL' | 'NEUTRAL';
  certaintyScore: number; // 0-100 for that timeframe
  reasons: string[];
  lastClose: number | null;
  indicators: {
    rsi?: number | null;
    bb?: { mid?: number | null; upper?: number | null; lower?: number | null } | null;
    stoch?: { k?: number | null; d?: number | null } | null;
  };
}

export interface Signal {
  asset: string;
  direction: 'BUY' | 'SELL' | 'NONE';
  entry: number | null;
  stopLoss: number | null;
  takeProfits: number[];
  riskPct: number;
  confidence: number; // 0-100
  reasons: string[];
  meta?: {
    scoreBreakdown?: Record<Timeframe, number>;
    timestamp?: string;
  };
}

// Default configurations
export const DEFAULT_TIMEFRAME_WEIGHTS: Record<Timeframe, number> = {
  D1: 3,
  H4: 2,
  H1: 2,
  M30: 1,
  M15: 1,
  M5: 0.5,
  M1: 0.25,
};

export const DEFAULT_INDICATOR_SCORES = {
  rsi: 30,
  bb: 30,
  stoch: 20,
  priceBeyondBb: 20,
};

export const DEFAULTS = {
  minConfidenceToTrade: 35,
  volatilityPeriod: 20,
  volatilityMultiplier: 1.0,
};

function safeLast<T>(arr: T[] | undefined): T | null {
  if (!arr || arr.length === 0) return null;
  return arr[arr.length - 1];
}

export function analyzeTimeframe(series: OHLCSeries, config: IndicatorConfig): TimeframeResult {
  // validate inputs
  const n = series.closes.length;
  const reasons: string[] = [];
  if (series.highs.length !== n || series.lows.length !== n) {
    throw new Error('analyzeTimeframe: highs, lows, closes must have same length');
  }
  if (n === 0) {
    return {
      timeframeHint: 'NEUTRAL',
      certaintyScore: 0,
      reasons: ['insufficient data: empty series'],
      lastClose: null,
      indicators: { rsi: null, bb: null, stoch: null },
    };
  }

  const lastClose = safeLast(series.closes)!;

  const rsiPeriod = config.rsiPeriod ?? 14;
  const bbPeriod = config.bbPeriod ?? 20;
  const bbStd = config.bbStdMultiplier ?? 2;
  const stochK = config.stochKPeriod ?? 5;
  const stochKS = config.stochKSmoothing ?? 3;
  const stochD = config.stochDPeriod ?? 3;

  const indicators: TimeframeResult['indicators'] = { rsi: null, bb: null, stoch: null };

  let rsiVal: number | null = null;
  if (config.rsiEnabled) {
    const r = computeRsi(series.closes, rsiPeriod);
    rsiVal = Number.isFinite(r[r.length - 1]) ? r[r.length - 1] : null;
    if (rsiVal === null) reasons.push(`insufficient data for RSI(${rsiPeriod})`);
    indicators.rsi = rsiVal;
  }

  let bbVals: { mid?: number | null; upper?: number | null; lower?: number | null } | null = null;
  if (config.bbEnabled) {
    const bb = bollingerBands(series.closes, bbPeriod, bbStd);
    const mid = bb.mid[bb.mid.length - 1];
    const upper = bb.upper[bb.upper.length - 1];
    const lower = bb.lower[bb.lower.length - 1];
    bbVals = {
      mid: Number.isFinite(mid) ? mid : null,
      upper: Number.isFinite(upper) ? upper : null,
      lower: Number.isFinite(lower) ? lower : null,
    };
    if (bbVals.mid === null) reasons.push(`insufficient data for BB(${bbPeriod})`);
    indicators.bb = bbVals;
  }

  let stochVals: { k?: number | null; d?: number | null } | null = null;
  if (config.stochEnabled) {
    const st = computeStochastic(series.highs, series.lows, series.closes, stochK, stochKS, stochD);
    const k = st.k[st.k.length - 1];
    const d = st.d[st.d.length - 1];
    stochVals = { k: Number.isFinite(k) ? k : null, d: Number.isFinite(d) ? d : null };
    if (stochVals.k === null || stochVals.d === null) reasons.push(`insufficient data for Stochastic(${stochK},${stochKS},${stochD})`);
    indicators.stoch = stochVals;
  }

  // Determine per-indicator confirmations and scores
  let scoreBuy = 0;
  let scoreSell = 0;

  // RSI
  if (config.rsiEnabled && indicators.rsi !== null) {
    const r = indicators.rsi as number;
    if (r < 30) {
      scoreBuy += DEFAULT_INDICATOR_SCORES.rsi;
      reasons.push(`RSI(${rsiPeriod})=${r.toFixed(1)} (oversold)`);
    } else if (r > 70) {
      scoreSell += DEFAULT_INDICATOR_SCORES.rsi;
      reasons.push(`RSI(${rsiPeriod})=${r.toFixed(1)} (overbought)`);
    } else {
      reasons.push(`RSI(${rsiPeriod})=${r.toFixed(1)} (neutral)`);
    }
  }

  // Bollinger Bands
  if (config.bbEnabled && indicators.bb) {
    const { upper, lower, mid } = indicators.bb;
    if (Number.isFinite(Number(upper)) && Number.isFinite(Number(lower))) {
      if (lastClose < (lower as number)) {
        scoreBuy += DEFAULT_INDICATOR_SCORES.bb;
        reasons.push('Price below lower Bollinger Band');
      } else if (lastClose > (upper as number)) {
        scoreSell += DEFAULT_INDICATOR_SCORES.bb;
        reasons.push('Price above upper Bollinger Band');
      } else {
        reasons.push('Price within Bollinger Bands');
      }
    }
  }

  // Price beyond BB momentum
  if (config.bbEnabled && indicators.bb) {
    const { upper, lower } = indicators.bb;
    if (Number.isFinite(Number(upper)) && Number.isFinite(Number(lower))) {
      if (lastClose > (upper as number)) {
        // strong momentum - price outside upper band -> consider sell momentum
        scoreSell += DEFAULT_INDICATOR_SCORES.priceBeyondBb;
        reasons.push('Price beyond upper BB (strong momentum)');
      } else if (lastClose < (lower as number)) {
        scoreBuy += DEFAULT_INDICATOR_SCORES.priceBeyondBb;
        reasons.push('Price beyond lower BB (strong momentum)');
      }
    }
  }

  // Stochastic
  if (config.stochEnabled && indicators.stoch) {
    const { k, d } = indicators.stoch;
    if (k !== null && d !== null) {
      // simple cross detection on last values (since we only have smoothed series, use k vs d)
      if (k > d && k < 20) {
        scoreBuy += DEFAULT_INDICATOR_SCORES.stoch;
        reasons.push(`Stochastic bullish (K=${k.toFixed(1)} <20) `);
      } else if (k < d && k > 80) {
        scoreSell += DEFAULT_INDICATOR_SCORES.stoch;
        reasons.push(`Stochastic bearish (K=${k.toFixed(1)} >80)`);
      } else {
        reasons.push(`Stochastic K=${k !== null ? k.toFixed(1) : 'n/a'} D=${d !== null ? d.toFixed(1) : 'n/a'}`);
      }
    }
  }

  // compute certainty for this timeframe: difference between buy and sell potential
  // We'll compute certainty as normalized absolute difference between buy and sell contributions, but also allow overall strength
  const rawScore = Math.max(0, scoreBuy - scoreSell);
  const rawScoreSell = Math.max(0, scoreSell - scoreBuy);
  // For simplicity define certaintyScore as max of (buy contribution, sell contribution), clipped to 100
  const certaintyScore = Math.min(100, Math.max(scoreBuy, scoreSell));

  let timeframeHint: TimeframeResult['timeframeHint'] = 'NEUTRAL';
  if (scoreBuy > scoreSell) timeframeHint = 'BUY';
  else if (scoreSell > scoreBuy) timeframeHint = 'SELL';
  else timeframeHint = 'NEUTRAL';

  return {
    timeframeHint,
    certaintyScore: Math.round(certaintyScore),
    reasons,
    lastClose,
    indicators,
  };
}

export function aggregateSignals(
  asset: string,
  timeframeResults: Partial<Record<Timeframe, TimeframeResult>>,
  userRiskPct: number,
  capital: number,
  opts?: {
    timeframeWeights?: Record<Timeframe, number>;
    minConfidenceToTrade?: number;
    volatilityPeriod?: number;
    volatilityMultiplier?: number;
  }
): Signal {
  const weights = opts?.timeframeWeights ?? DEFAULT_TIMEFRAME_WEIGHTS;
  const minConfidence = opts?.minConfidenceToTrade ?? DEFAULTS.minConfidenceToTrade;
  const volPeriod = opts?.volatilityPeriod ?? DEFAULTS.volatilityPeriod;
  const volMult = opts?.volatilityMultiplier ?? DEFAULTS.volatilityMultiplier;

  // accumulate weighted scores
  let weightedBuy = 0;
  let weightedSell = 0;
  let weightedMax = 0; // for normalization
  const breakdown: Record<Timeframe, number> = {} as any;
  const reasons: string[] = [];

  // helper to get max possible weighted (weight * 100)
  let maxPossibleWeighted = 0;
  (Object.keys(weights) as Timeframe[]).forEach((tf) => { maxPossibleWeighted += weights[tf] * 100; });

  (Object.keys(weights) as Timeframe[]).forEach((tf) => {
    const res = timeframeResults[tf];
    const w = weights[tf] ?? 0;
    if (!res) {
      breakdown[tf] = 0;
      reasons.push(`${tf}: no data`);
      return;
    }
    breakdown[tf] = res.certaintyScore;
    weightedMax += w * 100;
    if (res.timeframeHint === 'BUY') {
      weightedBuy += res.certaintyScore * w;
      reasons.push(`${tf}: BUY (${res.certaintyScore})`);
    } else if (res.timeframeHint === 'SELL') {
      weightedSell += res.certaintyScore * w;
      reasons.push(`${tf}: SELL (${res.certaintyScore})`);
    } else {
      reasons.push(`${tf}: NEUTRAL`);
    }
  });

  const confidence = maxPossibleWeighted === 0 ? 0 : Math.round(Math.min(100, ( (weightedBuy + weightedSell) / maxPossibleWeighted) * 100));

  // decide direction
  const diff = weightedBuy - weightedSell;
  let direction: Signal['direction'] = 'NONE';
  const margin = 10; // require minimal weighted difference
  if (confidence >= minConfidence && Math.abs(diff) >= margin) {
    direction = diff > 0 ? 'BUY' : 'SELL';
  } else {
    direction = 'NONE';
  }

  // determine entry price: choose the latest close from the highest-weight timeframe that has data
  const tfOrder = (Object.keys(weights) as Timeframe[]).sort((a, b) => (weights[b] - weights[a]));
  let entry: number | null = null;
  let chosenTf: Timeframe | null = null;
  for (const tf of tfOrder) {
    const res = timeframeResults[tf];
    if (res && res.lastClose !== null) {
      entry = res.lastClose;
      chosenTf = tf;
      break;
    }
  }

  // If no entry found, attempt any timeframe
  if (entry === null) {
    const any = Object.values(timeframeResults).find((r) => r && r.lastClose !== null);
    entry = any ? any!.lastClose : null;
  }

  // default outputs
  let stopLoss: number | null = null;
  const takeProfits: number[] = [];

  if (direction === 'NONE' || entry === null) {
    // return conservative NONE signal with reasons
    if (entry === null) reasons.push('no valid entry price available');
    return {
      asset,
      direction: 'NONE',
      entry: entry ?? null,
      stopLoss: null,
      takeProfits: [],
      riskPct: userRiskPct,
      confidence,
      reasons,
      meta: { scoreBreakdown: breakdown, timestamp: new Date().toISOString() },
    };
  }

  // compute volatility from the chosen timeframe closes if available
  const chosenSeries = timeframeResults[chosenTf as Timeframe];
  let sigma = 0;
  if (chosenSeries && chosenSeries.indicators) {
    // try to compute rollingStd on the closes provided in chosenSeries indicators? We don't have the entire series here.
    // As a pure engine, we expect callers to provide an OHLCSeries per timeframe when calling analyzeTimeframe first; however aggregateSignals
    // receives only timeframeResults. To keep engine pure, we'll expect the callers to include a meta field with recentCloses in timeframeResults (optional).
    // For now, attempt to compute volatility by checking if chosenSeries.indicators.bb?.mid exists: use distance between mid and upper as proxy
    if (chosenSeries.indicators && chosenSeries.indicators.bb && Number.isFinite(Number(chosenSeries.indicators.bb.mid)) && Number.isFinite(Number(chosenSeries.indicators.bb.upper))) {
      const mid = chosenSeries.indicators.bb.mid as number;
      const upper = chosenSeries.indicators.bb.upper as number;
      sigma = Math.abs(upper - mid) / 1; // deterministic safe fallback divisor
    }
  }

  // As aggregateSignals is pure and only receives timeframeResults, we need a robust fallback:
  // We'll compute SL using a percentage of entry if no volatility available.
  // Use a small epsilon to avoid zero SL.
  const epsilon = entry * 0.001; // 0.1% fallback

  // If sigma is zero or not available, fallback to epsilon
  if (!(sigma > 0)) sigma = epsilon;

  // apply volatility multiplier
  const slDistance = volMult * sigma;

  if (direction === 'BUY') {
    stopLoss = entry - slDistance;
    if (!(stopLoss < entry)) {
      reasons.push('computed stop loss is not below entry - aborting');
      return {
        asset,
        direction: 'NONE',
        entry,
        stopLoss: null,
        takeProfits: [],
        riskPct: userRiskPct,
        confidence,
        reasons,
        meta: { scoreBreakdown: breakdown, timestamp: new Date().toISOString() },
      };
    }
    const R = Math.abs(entry - stopLoss);
    takeProfits.push(entry + R);
    takeProfits.push(entry + 2 * R);
    takeProfits.push(entry + 3 * R);
  } else if (direction === 'SELL') {
    stopLoss = entry + slDistance;
    if (!(stopLoss > entry)) {
      reasons.push('computed stop loss is not above entry - aborting');
      return {
        asset,
        direction: 'NONE',
        entry,
        stopLoss: null,
        takeProfits: [],
        riskPct: userRiskPct,
        confidence,
        reasons,
        meta: { scoreBreakdown: breakdown, timestamp: new Date().toISOString() },
      };
    }
    const R = Math.abs(entry - stopLoss);
    takeProfits.push(entry - R);
    takeProfits.push(entry - 2 * R);
    takeProfits.push(entry - 3 * R);
  }

  return {
    asset,
    direction: direction === 'BUY' ? 'BUY' : direction === 'SELL' ? 'SELL' : 'NONE',
    entry,
    stopLoss,
    takeProfits,
    riskPct: userRiskPct,
    confidence,
    reasons,
    meta: { scoreBreakdown: breakdown, timestamp: new Date().toISOString() },
  };
}
