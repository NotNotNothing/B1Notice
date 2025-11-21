import { useCallback, useEffect, useState } from 'react';
import { TradeRecord } from '@/types/trade';

const STORAGE_KEY = 'trade-records';

const readFromStorage = (): TradeRecord[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TradeRecord[];
  } catch (error) {
    console.error('读取交易记录失败', error);
    return [];
  }
};

export const useTradeRecords = () => {
  const [records, setRecords] = useState<TradeRecord[]>([]);

  useEffect(() => {
    setRecords(readFromStorage());
  }, []);

  const persist = useCallback((next: TradeRecord[]) => {
    setRecords(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  }, []);

  const addRecord = useCallback((record: TradeRecord) => {
    persist([record, ...records]);
  }, [persist, records]);

  const removeRecord = useCallback((id: string) => {
    persist(records.filter((item) => item.id !== id));
  }, [persist, records]);

  const importRecords = useCallback((items: TradeRecord[]) => {
    if (!items.length) return;
    persist([...items, ...records]);
  }, [persist, records]);

  return {
    records,
    addRecord,
    removeRecord,
    importRecords,
  };
};
