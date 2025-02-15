import { create } from 'zustand';
import { StockState, AlertConfig, StockData } from '../types/stock';

type StockStore = StockState & {
  setData: (data: StockData[]) => void;
  addAlert: (alert: AlertConfig) => void;
  removeAlert: (id: string) => void;
  toggleAlert: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
};

const initialState: StockState = {
  data: [],
  alerts: [],
  loading: false,
  error: null,
};

export const useStockStore = create<StockStore>((set) => ({
  ...initialState,
  setData: (data: StockData[]) => set({ data }),
  addAlert: (alert: AlertConfig) => set((state: StockState) => ({
    alerts: [...state.alerts, alert]
  })),
  removeAlert: (id: string) => set((state: StockState) => ({
    alerts: state.alerts.filter((alert) => alert.id !== id),
  })),
  toggleAlert: (id: string) => set((state: StockState) => ({
    alerts: state.alerts.map((alert) =>
      alert.id === id ? { ...alert, enabled: !alert.enabled } : alert
    ),
  })),
  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error }),
}));
