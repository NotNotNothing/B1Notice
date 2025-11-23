import { useCallback, useEffect, useState } from 'react';
import { TradeRecord } from '@/types/trade';

const normalizeRecord = (record: TradeRecord): TradeRecord => ({
  ...record,
  symbol: record.symbol?.toUpperCase().trim() || record.symbol,
  isLuZhu: record.isLuZhu ?? false,
});

export const useTradeRecords = () => {
  const [records, setRecords] = useState<TradeRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/trades');
      if (!res.ok) return;
      const data = await res.json();
      setRecords((data.records || []).map(normalizeRecord));
    } catch (error) {
      console.error('获取交易记录失败', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const addRecord = useCallback(async (record: TradeRecord) => {
    try {
      const res = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      if (!res.ok) {
        return false;
      }
      const data = await res.json();
      if (!data.record) return false;
      setRecords((prev) => [
        normalizeRecord(data.record),
        ...prev.filter((item) => item.id !== data.record.id),
      ]);
      return true;
    } catch (error) {
      console.error('添加交易记录失败', error);
      return false;
    }
  }, []);

  const removeRecord = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/trades/${id}`, { method: 'DELETE' });
      if (!res.ok) return false;
      setRecords((prev) => prev.filter((item) => item.id !== id));
      return true;
    } catch (error) {
      console.error('删除交易记录失败', error);
      return false;
    }
  }, []);

  const updateRecord = useCallback(
    async (id: string, updater: (record: TradeRecord) => TradeRecord) => {
      let nextRecord: TradeRecord | undefined;
      setRecords((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          nextRecord = normalizeRecord(updater(item));
          return nextRecord;
        }),
      );
      if (!nextRecord) return;
      try {
        await fetch(`/api/trades/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(nextRecord),
        });
      } catch (error) {
        console.error('更新交易记录失败', error);
      }
    },
    [],
  );

  const importRecords = useCallback(
    async (items: TradeRecord[]) => {
      if (!items.length) return { added: 0, success: false };
      try {
        const res = await fetch('/api/trades/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ records: items }),
        });
        const text = await res.text();
        if (!res.ok) {
          return { added: 0, success: false, message: text || '导入失败' };
        }
        let data: any = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch (e) {
          data = {};
        }
        setRecords((data.records || []).map(normalizeRecord));
        return { added: data.added || 0, success: true };
      } catch (error) {
        console.error('导入交易记录失败', error);
        return { added: 0, success: false, message: '导入交易记录失败' };
      }
    },
    [],
  );

  return {
    records,
    loading,
    fetchRecords,
    addRecord,
    removeRecord,
    updateRecord,
    importRecords,
  };
};
