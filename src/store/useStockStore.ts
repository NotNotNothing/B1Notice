import { create } from 'zustand';
import { StockState, AlertConfig, StockData } from '../types/stock';

type StockStore = {
  stocks: StockData[];
  alerts: AlertConfig[];
  loading: boolean;
  error: string | null;
  fetchStocks: () => Promise<void>;
  addAlert: (alert: AlertConfig) => void;
  removeAlert: (id: string) => void;
  toggleAlert: (id: string) => void;
};

const symbols = [
  'BABA.US',
  'JD.US',
  'NVDA.US',
  'AAPL.US',
  'MSFT.US',
  '01810.HK',
  '00700.HK',
  '02331.HK',
];

export const useStockStore = create<StockStore>((set) => ({
  stocks: [],
  alerts: [],
  loading: false,
  error: null,
  fetchStocks: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch('/api/stocks', {
        method: 'POST',
        body: JSON.stringify({ symbols }),
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const stocksData = await response.json();
      set({ stocks: stocksData, loading: false });
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
}));
