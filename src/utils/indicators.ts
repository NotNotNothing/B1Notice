import { KLineData } from '../types/stock';

interface KDJResult {
  k: number;
  d: number;
  j: number;
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
