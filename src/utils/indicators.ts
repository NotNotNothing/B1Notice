import { KLineData } from '../types/stock';

interface KDJResult {
  k: number;
  d: number;
  j: number;
}

interface BBIResult {
  bbi: number;
  ma3: number;
  ma6: number;
  ma12: number;
  ma24: number;
}

export interface ZhixingTrendSeriesPoint {
  timestamp: string;
  whiteLine: number;
  yellowLine: number;
}

export interface ZhixingTrendResult {
  timestamp: string;
  whiteLine: number;
  yellowLine: number;
  previousWhiteLine: number;
  previousYellowLine: number;
  isGoldenCross: boolean;
  isDeathCross: boolean;
  series?: ZhixingTrendSeriesPoint[];
}

export interface ZhixingTrendOptions {
  m1?: number;
  m2?: number;
  m3?: number;
  m4?: number;
}

export function calculateKDJ(
  klineData: KLineData[],
  period: number = 9,
  k: number = 3,
  d: number = 3
): KDJResult {
  if (klineData.length < period) {
    return { k: 50, d: 50, j: 50 };
  }

  // 计算RSV
  const currentData = klineData[klineData.length - 1];
  const periodData = klineData.slice(-period);

  const highestHigh = Math.max(...periodData.map(d => d.high));
  const lowestLow = Math.min(...periodData.map(d => d.low));

  const rsv = ((currentData.close - lowestLow) / (highestHigh - lowestLow)) * 100;

  // 计算K值
  const prevK: number = klineData.length > period ? calculateKDJ(klineData.slice(0, -1), period, k, d).k : 50;
  const currentK: number = (2 / 3) * prevK + (1 / 3) * rsv;

  // 计算D值
  const prevD: number = klineData.length > period ? calculateKDJ(klineData.slice(0, -1), period, k, d).d : 50;
  const currentD: number = (2 / 3) * prevD + (1 / 3) * currentK;

  // 计算J值
  const currentJ: number = 3 * currentK - 2 * currentD;

  return {
    k: Number(currentK.toFixed(2)),
    d: Number(currentD.toFixed(2)),
    j: Number(currentJ.toFixed(2)),
  };
}

function calculateMA(data: KLineData[], period: number): number {
  if (data.length < period) {
    return 0;
  }
  
  const sum = data.slice(-period).reduce((acc, item) => acc + item.close, 0);
  return sum / period;
}

function calculateMASeries(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  let sum = 0;

  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) {
      sum -= values[i - period];
    }

    if (i >= period - 1) {
      result.push(sum / period);
    } else {
      result.push(null);
    }
  }

  return result;
}

function calculateEMASeries(values: number[], period: number): number[] {
  if (values.length === 0) {
    return [];
  }

  const multiplier = 2 / (period + 1);
  const result: number[] = [];
  let ema = values[0];
  result.push(ema);

  for (let i = 1; i < values.length; i++) {
    ema = (values[i] - ema) * multiplier + ema;
    result.push(ema);
  }

  return result;
}

export function calculateBBI(klineData: KLineData[]): BBIResult {
  if (klineData.length < 24) {
    return { bbi: 0, ma3: 0, ma6: 0, ma12: 0, ma24: 0 };
  }

  const ma3 = calculateMA(klineData, 3);
  const ma6 = calculateMA(klineData, 6);
  const ma12 = calculateMA(klineData, 12);
  const ma24 = calculateMA(klineData, 24);

  const bbi = (ma3 + ma6 + ma12 + ma24) / 4;

  return {
    bbi: Number(bbi.toFixed(2)),
    ma3: Number(ma3.toFixed(2)),
    ma6: Number(ma6.toFixed(2)),
    ma12: Number(ma12.toFixed(2)),
    ma24: Number(ma24.toFixed(2)),
  };
}

export function checkBBIConsecutiveDays(
  historicalData: Array<{ close: number; bbi: number; date: string }>
): {
  aboveBBIConsecutiveDays: boolean;
  belowBBIConsecutiveDays: boolean;
  aboveBBIConsecutiveDaysCount: number;
  belowBBIConsecutiveDaysCount: number;
} {
  if (historicalData.length < 2) {
    return { 
      aboveBBIConsecutiveDays: false, 
      belowBBIConsecutiveDays: false,
      aboveBBIConsecutiveDaysCount: 0,
      belowBBIConsecutiveDaysCount: 0
    };
  }

  let aboveBBIConsecutiveDaysCount = 0;
  let belowBBIConsecutiveDaysCount = 0;

  // 从最新的数据开始向前计算连续天数
  for (let i = historicalData.length - 1; i >= 0; i--) {
    const current = historicalData[i];
    
    if (current.close > current.bbi) {
      if (belowBBIConsecutiveDaysCount === 0) {
        aboveBBIConsecutiveDaysCount++;
      } else {
        break; // 如果之前有低于BBI的天数，则中断高于BBI的连续计数
      }
    } else if (current.close < current.bbi) {
      if (aboveBBIConsecutiveDaysCount === 0) {
        belowBBIConsecutiveDaysCount++;
      } else {
        break; // 如果之前有高于BBI的天数，则中断低于BBI的连续计数
      }
    } else {
      // 价格等于BBI，中断连续计数
      break;
    }
  }

  const aboveBBIConsecutiveDays = aboveBBIConsecutiveDaysCount >= 2;
  const belowBBIConsecutiveDays = belowBBIConsecutiveDaysCount >= 2;

  return {
    aboveBBIConsecutiveDays,
    belowBBIConsecutiveDays,
    aboveBBIConsecutiveDaysCount,
    belowBBIConsecutiveDaysCount,
  };
}

const DEFAULT_ZHIXING_OPTIONS: Required<ZhixingTrendOptions> = {
  m1: 14,
  m2: 28,
  m3: 57,
  m4: 114,
};

function normalizePeriod(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  const intValue = Math.round(value);
  return Math.min(999, Math.max(2, intValue));
}

function buildZhixingSeries(
  klineData: KLineData[],
  options?: ZhixingTrendOptions
) {
  if (!klineData.length) {
    return null;
  }

  const settings: Required<ZhixingTrendOptions> = {
    m1: normalizePeriod(options?.m1 ?? DEFAULT_ZHIXING_OPTIONS.m1, DEFAULT_ZHIXING_OPTIONS.m1),
    m2: normalizePeriod(options?.m2 ?? DEFAULT_ZHIXING_OPTIONS.m2, DEFAULT_ZHIXING_OPTIONS.m2),
    m3: normalizePeriod(options?.m3 ?? DEFAULT_ZHIXING_OPTIONS.m3, DEFAULT_ZHIXING_OPTIONS.m3),
    m4: normalizePeriod(options?.m4 ?? DEFAULT_ZHIXING_OPTIONS.m4, DEFAULT_ZHIXING_OPTIONS.m4),
  };

  const maxPeriod = Math.max(settings.m1, settings.m2, settings.m3, settings.m4);
  if (klineData.length < maxPeriod) {
    return null;
  }

  const closes = klineData.map((item) => item.close);
  const firstEma = calculateEMASeries(closes, 10);
  const secondEma = calculateEMASeries(firstEma, 10);

  const ma1Series = calculateMASeries(closes, settings.m1);
  const ma2Series = calculateMASeries(closes, settings.m2);
  const ma3Series = calculateMASeries(closes, settings.m3);
  const ma4Series = calculateMASeries(closes, settings.m4);

  const yellowSeries: (number | null)[] = closes.map((_, index) => {
    const maValues = [
      ma1Series[index],
      ma2Series[index],
      ma3Series[index],
      ma4Series[index],
    ];

    if (maValues.some((value) => value === null)) {
      return null;
    }

    const total = maValues.reduce((sum, value) => sum + (value ?? 0), 0);
    return total / maValues.length;
  });

  const whiteSeriesRaw: (number | null)[] = secondEma.map((value, index) =>
    yellowSeries[index] === null ? null : value
  );

  const whiteSeries: (number | null)[] = whiteSeriesRaw.map((value) =>
    value === null ? null : Number(value.toFixed(2))
  );

  const yellowSeriesRounded: (number | null)[] = yellowSeries.map((value) =>
    value === null ? null : Number(value.toFixed(2))
  );

  return {
    settings,
    whiteSeriesRaw,
    whiteSeries,
    yellowSeries: yellowSeriesRounded,
  };
}

export function calculateZhixingTrend(
  klineData: KLineData[],
  options?: ZhixingTrendOptions
): ZhixingTrendResult | null {
  const seriesContext = buildZhixingSeries(klineData, options);

  if (!seriesContext) {
    return null;
  }

  const { whiteSeriesRaw, whiteSeries, yellowSeries } = seriesContext;
  const lastIndex = yellowSeries.length - 1;
  const currentYellow = yellowSeries[lastIndex];
  const currentWhite = whiteSeries[lastIndex];
  const currentWhiteRaw = whiteSeriesRaw[lastIndex];

  if (
    currentYellow === null ||
    currentWhite === null ||
    currentWhiteRaw === null
  ) {
    return null;
  }

  let previousIndex = lastIndex - 1;
  while (
    previousIndex >= 0 &&
    (yellowSeries[previousIndex] === null || whiteSeriesRaw[previousIndex] === null)
  ) {
    previousIndex -= 1;
  }

  if (previousIndex < 0) {
    return null;
  }

  const previousYellow = yellowSeries[previousIndex];
  const previousWhiteRaw = whiteSeriesRaw[previousIndex];
  const previousWhite = whiteSeries[previousIndex];

  if (
    previousYellow === null ||
    previousWhiteRaw === null ||
    previousWhite === null
  ) {
    return null;
  }

  const isGoldenCross =
    previousWhiteRaw <= previousYellow && currentWhiteRaw > currentYellow;
  const isDeathCross =
    previousWhiteRaw >= previousYellow && currentWhiteRaw < currentYellow;

  const points: ZhixingTrendSeriesPoint[] = [];
  for (let index = 0; index < klineData.length; index += 1) {
    const whiteValue = whiteSeries[index];
    const yellowValue = yellowSeries[index];
    if (whiteValue !== null && yellowValue !== null) {
      points.push({
        timestamp: klineData[index].timestamp,
        whiteLine: whiteValue,
        yellowLine: yellowValue,
      });
    }
  }

  const maxSeriesLength = 120;
  const trimmedSeries =
    points.length > maxSeriesLength
      ? points.slice(points.length - maxSeriesLength)
      : points;

  return {
    timestamp: klineData[lastIndex].timestamp,
    whiteLine: currentWhite,
    yellowLine: currentYellow,
    previousWhiteLine: previousWhite,
    previousYellowLine: previousYellow,
    isGoldenCross,
    isDeathCross,
    series: trimmedSeries,
  };
}

export interface SellSignalResult {
  hasSellSignal: boolean;
  consecutiveDaysBelowWhiteLine: number;
  lastTwoDaysData: Array<{
    date: string;
    price: number;
    whiteLine: number;
    belowWhiteLine: boolean;
  }>;
}

export function checkSellSignal(
  klineData: KLineData[],
  trendSeries?: ZhixingTrendSeriesPoint[],
  fallbackWhiteLine?: number
): SellSignalResult {
  if (!klineData.length) {
    return {
      hasSellSignal: false,
      consecutiveDaysBelowWhiteLine: 0,
      lastTwoDaysData: [],
    };
  }

  const trendPoints = trendSeries ?? [];
  const latestTrendPoint =
    trendPoints.length > 0
      ? trendPoints[trendPoints.length - 1]
      : undefined;

  const trendMap = new Map<string, ZhixingTrendSeriesPoint>();
  trendPoints.forEach((point) => {
    trendMap.set(String(point.timestamp), point);
  });

  const enrichedData = klineData.map((item) => {
    const trendPoint = trendMap.get(String(item.timestamp));
    const resolvedWhiteLine =
      trendPoint?.whiteLine ??
      latestTrendPoint?.whiteLine ??
      fallbackWhiteLine;

    const belowWhiteLine =
      resolvedWhiteLine !== undefined && resolvedWhiteLine !== null
        ? item.close < resolvedWhiteLine
        : false;

    return {
      date: item.timestamp,
      price: item.close,
      whiteLine: resolvedWhiteLine ?? 0,
      belowWhiteLine,
    };
  });

  let consecutiveDaysBelowWhiteLine = 0;
  for (let index = enrichedData.length - 1; index >= 0; index -= 1) {
    if (enrichedData[index].belowWhiteLine) {
      consecutiveDaysBelowWhiteLine += 1;
    } else {
      break;
    }
  }

  const lastTwoDaysData = enrichedData.slice(-2);

  const hasSellSignal = consecutiveDaysBelowWhiteLine >= 2;

  return {
    hasSellSignal,
    consecutiveDaysBelowWhiteLine,
    lastTwoDaysData,
  };
}
