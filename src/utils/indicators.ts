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
