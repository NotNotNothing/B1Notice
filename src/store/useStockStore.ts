import { create } from 'zustand';
import { AlertConfig, StockData } from '../types/stock';

type StockStore = {
  stocks: StockData[];
  alerts: AlertConfig[];
  loading: boolean;
  error: string | null;
  isKDJDescending: boolean;
  fetchStocks: () => Promise<void>;
  addAlert: (alert: AlertConfig) => void;
  removeAlert: (id: string) => void;
  toggleAlert: (id: string) => void;
  toggleSortByKDJ: () => void;
};

// 曼城阵容
// const symbols = [
//   '002594.SZ', // 比亚迪
//   '600570.SH', // 恒生电子
//   '600519.SH', // 贵州茅台
//   '000776.SZ', // 广发证券
//   '601127.SH', // 赛力斯
//   '600030.SH', // 中信
//   '00700.HK', // 腾讯控股
//   '01810.HK', // 小米集团
//   '02331.HK', // 李宁
//   'BABA.US', // 阿里巴巴
//   'NVDA.US', // 英伟达
//   'AAPL.US', // 苹果
//   'MSFT.US', // 微软
//   'JD.US', // 京东
// ];

export const useStockStore = create<StockStore>((set) => ({
  stocks: [],
  alerts: [],
  loading: false,
  error: null,
  isKDJDescending: false,
  fetchStocks: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch('/api/stocks');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const stocksData = await response.json();
      set((state) => {
        const sortedStocks = [...stocksData].sort((a, b) => {
          if (state.isKDJDescending) {
            return (b.kdj?.j || 0) - (a.kdj?.j || 0); // 降序：大 -> 小
          } else {
            return (a.kdj?.j || 0) - (b.kdj?.j || 0); // 升序：小 -> 大
          }
        });
        return { stocks: sortedStocks, loading: false };
      });
    } catch (error) {
      set({ error: '获取股票数据失败', loading: false });
      console.error('获取股票数据失败:', error);
    }
  },
  addAlert: (alert: AlertConfig) =>
    set((state) => ({
      alerts: [...state.alerts, alert],
    })),
  removeAlert: (id: string) =>
    set((state) => ({
      alerts: state.alerts.filter((alert) => alert.id !== id),
    })),
  toggleAlert: (id: string) =>
    set((state) => ({
      alerts: state.alerts.map((alert) =>
        alert.id === id ? { ...alert, enabled: !alert.enabled } : alert,
      ),
    })),
  toggleSortByKDJ: () =>
    set((state) => {
      const newIsDescending = !state.isKDJDescending;
      const sortedStocks = [...state.stocks].sort((a, b) => {
        if (newIsDescending) {
          return (b.kdj?.j || 0) - (a.kdj?.j || 0); // 降序：大 -> 小
        } else {
          return (a.kdj?.j || 0) - (b.kdj?.j || 0); // 升序：小 -> 大
        }
      });
      return { isKDJDescending: newIsDescending, stocks: sortedStocks };
    }),
}));
