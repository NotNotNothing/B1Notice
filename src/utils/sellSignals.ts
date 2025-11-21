import { KLineData } from '../types/stock';

export interface SellSignalResult {
  isSellSignal: boolean;
  reason: string;
  stageHigh: number;
  currentPrice: number;
  volumeRank: number;
  isBearishCandle: boolean;
}

/**
 * 检测卖出信号：阶段高点 + 放量阴线
 * @param klineData K线数据（至少需要180个交易日，约6个月）
 * @returns 卖出信号检测结果
 */
export function detectSellSignal(klineData: KLineData[]): SellSignalResult {
  if (klineData.length < 30) {
    return {
      isSellSignal: false,
      reason: '数据不足，需要至少30个交易日的数据',
      stageHigh: 0,
      currentPrice: 0,
      volumeRank: 0,
      isBearishCandle: false
    };
  }

  const currentData = klineData[klineData.length - 1];
  const currentPrice = currentData.close;
  const currentVolume = currentData.volume;

  // 1. 检测阶段高点（6个月内最高点）
  const sixMonthsData = klineData.slice(-180); // 约6个月的数据（180个交易日）
  const stageHigh = Math.max(...sixMonthsData.map(d => d.high));
  const isStageHigh = currentPrice >= stageHigh * 0.98; // 允许2%的误差

  // 2. 检测放量（成交量接近前30个交易日内的前三高）
  const last30DaysData = klineData.slice(-30);
  const volumes = last30DaysData.map(d => d.volume);
  const sortedVolumes = [...volumes].sort((a, b) => b - a);
  const top3Volumes = sortedVolumes.slice(0, 3);
  const isHighVolume = top3Volumes.some(volume =>
    currentVolume >= volume * 0.8 && currentVolume <= volume * 1.2
  );
  const volumeRank = volumes.indexOf(currentVolume) + 1; // 当前成交量在30天内的排名

  // 3. 检测阴线（收盘价低于开盘价）
  const isBearishCandle = currentData.close < currentData.open;

  // 4. 综合判断卖出信号
  const isSellSignal = isStageHigh && isHighVolume && isBearishCandle;

  let reason = '';
  if (isSellSignal) {
    reason = `阶段高点${stageHigh.toFixed(2)}，放量阴线（成交量排名第${volumeRank}），建议卖出`;
  } else if (isStageHigh && isHighVolume) {
    reason = `阶段高点${stageHigh.toFixed(2)}，放量但非阴线`;
  } else if (isStageHigh && isBearishCandle) {
    reason = `阶段高点${stageHigh.toFixed(2)}，阴线但未放量`;
  } else if (isHighVolume && isBearishCandle) {
    reason = `放量阴线但非阶段高点`;
  } else {
    reason = '未满足卖出信号条件';
  }

  return {
    isSellSignal,
    reason,
    stageHigh,
    currentPrice,
    volumeRank,
    isBearishCandle
  };
}

/**
 * 获取最近30个交易日的成交量排名
 * @param klineData K线数据
 * @returns 成交量排名信息
 */
export function getVolumeRankInfo(klineData: KLineData[]) {
  if (klineData.length < 30) {
    return {
      currentVolume: 0,
      rank: 0,
      top3Volumes: [],
      totalDays: 0
    };
  }

  const last30DaysData = klineData.slice(-30);
  const volumes = last30DaysData.map(d => d.volume);
  const currentVolume = volumes[volumes.length - 1];
  const sortedVolumes = [...volumes].sort((a, b) => b - a);
  const rank = sortedVolumes.indexOf(currentVolume) + 1;
  const top3Volumes = sortedVolumes.slice(0, 3);

  return {
    currentVolume,
    rank,
    top3Volumes,
    totalDays: 30
  };
}

/**
 * 检测6个月内的阶段高点
 * @param klineData K线数据
 * @returns 阶段高点信息
 */
export function detectStageHigh(klineData: KLineData[]) {
  if (klineData.length < 180) {
    return {
      stageHigh: 0,
      currentPrice: 0,
      isStageHigh: false,
      daysData: 0
    };
  }

  const sixMonthsData = klineData.slice(-180);
  const stageHigh = Math.max(...sixMonthsData.map(d => d.high));
  const currentPrice = klineData[klineData.length - 1].close;
  const isStageHigh = currentPrice >= stageHigh * 0.98;

  return {
    stageHigh,
    currentPrice,
    isStageHigh,
    daysData: sixMonthsData.length
  };
}