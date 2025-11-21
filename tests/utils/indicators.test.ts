import { calculateZhixingTrend, checkSellSignal } from '../../src/utils/indicators';
import { KLineData } from '../../src/types/stock';

describe('calculateZhixingTrend', () => {
  const toKLines = (closes: number[]): KLineData[] =>
    closes.map((close, index) => ({
      timestamp: new Date(2024, 0, index + 1).toISOString(),
      open: close,
      high: close,
      low: close,
      close,
      volume: 0,
    }));

  it('returns null when there is not enough data for the slowest average', () => {
    const closes = [10, 11, 12, 13, 14, 15, 16];
    const result = calculateZhixingTrend(toKLines(closes));
    expect(result).toBeNull();
  });

  it('identifies golden cross scenarios correctly', () => {
    const closes = [
      46.85, 49.68, 52.15, 53.39, 53.52, 52.25, 53.98, 54.66, 51.53, 53.56,
      52.68, 56.64, 54.6, 52.66, 54.64, 55.58, 51.67, 51.24, 48.11, 48.48,
      45.24, 47.32, 48.83, 50.27, 53.05, 49.6, 45.94, 43.56, 46.2, 46.22,
      49.26, 53.1, 49.43, 46.87, 46.14, 42.93, 42.79, 45.67, 45.94, 42.01,
      38.78, 38.37, 38.53, 40.9, 39.79, 41.1, 43.6, 44.62, 45.12, 48.78,
      49.08, 52.36, 51.2, 53.27, 49.72, 47.97, 46.74, 44.68, 42.73, 46.31,
    ];

    const result = calculateZhixingTrend(toKLines(closes), {
      m1: 5,
      m2: 8,
      m3: 13,
      m4: 21,
    });

    expect(result).not.toBeNull();
    expect(result?.isGoldenCross).toBe(true);
    expect(result?.isDeathCross).toBe(false);
    expect(result?.whiteLine).toBeCloseTo(46.75, 2);
    expect(result?.yellowLine).toBeCloseTo(46.61, 2);
  });

  it('identifies death cross scenarios correctly', () => {
    const closes = [
      59.59, 59.37, 56.21, 59.94, 61.88, 63.92, 67.68, 65.05, 62.41, 61.36,
      61.93, 59.43, 63.86, 68.25, 69.76, 67.95, 64.54, 65.38, 68.1, 65.68,
      61.56, 57.81, 56.13, 52.74, 51.13, 48.68, 47.47, 44.09, 46.25, 47.61,
      47.81, 47.3, 44.48, 42.04, 46.08, 41.63, 38.83, 36.87, 33.91, 37.51,
      41.43, 44.69, 46.19, 42.3, 41.38, 39.83, 39.11, 35.99, 34, 30.61, 26.85,
      30.7, 30.32, 33.97, 35.61, 31.11, 35.03, 39.18, 39.32, 40.28,
    ];

    const result = calculateZhixingTrend(toKLines(closes), {
      m1: 5,
      m2: 8,
      m3: 13,
      m4: 21,
    });

    expect(result).not.toBeNull();
    expect(result?.isGoldenCross).toBe(false);
    expect(result?.isDeathCross).toBe(true);
    expect(result?.whiteLine).toBeCloseTo(35.84, 2);
    expect(result?.yellowLine).toBeCloseTo(35.9, 2);
  });
});

describe('checkSellSignal', () => {
  const buildKLines = (closes: number[]): KLineData[] =>
    closes.map((close, index) => ({
      timestamp: `2024-01-${(index + 1).toString().padStart(2, '0')}`,
      open: close + 1,
      high: close + 1,
      low: close - 1,
      close,
      volume: 0,
    }));

  it('detects consecutive closes below white line and counts them correctly', () => {
    const kLines = buildKLines([10.5, 9.8, 9.6, 9.4]);
    const trendSeries = kLines.map((item, index) => ({
      timestamp: item.timestamp,
      whiteLine: 10.6 - index * 0.1,
      yellowLine: 10.0,
    }));

    const result = checkSellSignal(kLines, trendSeries);

    expect(result.hasSellSignal).toBe(true);
    expect(result.consecutiveDaysBelowWhiteLine).toBe(3);
    expect(result.lastTwoDaysData).toHaveLength(2);
    expect(result.lastTwoDaysData[1].belowWhiteLine).toBe(true);
  });

  it('falls back to latest white line when series is missing entries', () => {
    const kLines = buildKLines([9.9, 9.7, 9.5]);
    const trendSeries = [
      {
        timestamp: kLines[0].timestamp,
        whiteLine: 10.2,
        yellowLine: 10.0,
      },
    ];

    const result = checkSellSignal(kLines, trendSeries, 10);

    expect(result.hasSellSignal).toBe(true);
    expect(result.consecutiveDaysBelowWhiteLine).toBe(3);
  });

  it('returns no sell signal when the latest close is above the white line', () => {
    const kLines = buildKLines([9.7, 9.5, 9.8]);
    const trendSeries = kLines.map((item) => ({
      timestamp: item.timestamp,
      whiteLine: 9.6,
      yellowLine: 9.6,
    }));

    const result = checkSellSignal(kLines, trendSeries);

    expect(result.hasSellSignal).toBe(false);
    expect(result.consecutiveDaysBelowWhiteLine).toBe(0);
  });
});
