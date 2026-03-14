import {
  normalizeSide,
  normalizeSymbol,
  toDate,
  normalizeTradeRecord,
  type TradeImportItem,
} from '@/server/trade/service';

describe('Trade Service', () => {
  describe('normalizeSide', () => {
    it('should return SELL for uppercase SELL', () => {
      expect(normalizeSide('SELL')).toBe('SELL');
    });

    it('should return SELL for lowercase sell', () => {
      expect(normalizeSide('sell')).toBe('SELL');
    });

    it('should return SELL for mixed case', () => {
      expect(normalizeSide('SeLl')).toBe('SELL');
    });

    it('should return BUY for BUY', () => {
      expect(normalizeSide('BUY')).toBe('BUY');
    });

    it('should return BUY for undefined', () => {
      expect(normalizeSide(undefined)).toBe('BUY');
    });

    it('should return BUY for any other value', () => {
      expect(normalizeSide('HOLD')).toBe('BUY');
    });
  });

  describe('normalizeSymbol', () => {
    it('should add .SH suffix for 6-prefix 6-digit codes', () => {
      expect(normalizeSymbol('600519')).toBe('600519.SH');
      expect(normalizeSymbol('688981')).toBe('688981.SH');
    });

    it('should add .SH suffix for 5-prefix 6-digit codes', () => {
      expect(normalizeSymbol('510300')).toBe('510300.SH');
    });

    it('should add .SZ suffix for 0-prefix 6-digit codes', () => {
      expect(normalizeSymbol('000001')).toBe('000001.SZ');
    });

    it('should add .SZ suffix for 2-prefix 6-digit codes', () => {
      expect(normalizeSymbol('002594')).toBe('002594.SZ');
    });

    it('should add .SZ suffix for 3-prefix 6-digit codes', () => {
      expect(normalizeSymbol('300001')).toBe('300001.SZ');
    });

    it('should not modify symbols with dots', () => {
      expect(normalizeSymbol('00700.HK')).toBe('00700.HK');
      expect(normalizeSymbol('AAPL.US')).toBe('AAPL.US');
    });

    it('should handle lowercase input', () => {
      expect(normalizeSymbol('aapl.us')).toBe('AAPL.US');
    });

    it('should trim whitespace', () => {
      expect(normalizeSymbol('  600519  ')).toBe('600519.SH');
    });

    it('should return empty string for empty input', () => {
      expect(normalizeSymbol('')).toBe('');
      expect(normalizeSymbol(undefined as any)).toBe('');
    });

    it('should not modify non-6-digit codes', () => {
      expect(normalizeSymbol('AAPL')).toBe('AAPL');
      expect(normalizeSymbol('00700')).toBe('00700');
    });
  });

  describe('toDate', () => {
    it('should parse ISO date string', () => {
      const date = toDate('2024-01-15');
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(0);
      expect(date.getDate()).toBe(15);
    });

    it('should parse date with time', () => {
      const date = toDate('2024-01-15 14:30');
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(0);
      expect(date.getDate()).toBe(15);
      expect(date.getHours()).toBe(14);
      expect(date.getMinutes()).toBe(30);
    });

    it('should handle Date object input', () => {
      const inputDate = new Date('2024-06-20');
      const result = toDate(inputDate);
      expect(result.getTime()).toBe(inputDate.getTime());
    });

    it('should return current date for invalid string', () => {
      const result = toDate('invalid');
      const now = new Date();
      expect(result.getFullYear()).toBe(now.getFullYear());
      expect(result.getMonth()).toBe(now.getMonth());
    });

    it('should return current date for undefined', () => {
      const result = toDate(undefined);
      const now = new Date();
      expect(result.getFullYear()).toBe(now.getFullYear());
      expect(result.getMonth()).toBe(now.getMonth());
    });
  });

  describe('normalizeTradeRecord', () => {
    const userId = 'test-user-id';

    it('should normalize complete trade record', () => {
      const item: TradeImportItem = {
        symbol: '600519',
        securityName: '贵州茅台',
        side: 'BUY',
        quantity: 100,
        price: 1800.5,
        tradedAt: '2024-01-15 15:00',
        note: '测试交易',
        stopLossPrice: 1700,
        takeProfitPrice: 2000,
        stopRule: 'whiteLine',
        isLuZhu: true,
      };

      const result = normalizeTradeRecord(item, userId);

      expect(result).toEqual({
        userId,
        symbol: '600519.SH',
        securityName: '贵州茅台',
        side: 'BUY',
        quantity: 100,
        price: 1800.5,
        tradedAt: expect.any(Date),
        note: '测试交易',
        stopLossPrice: 1700,
        takeProfitPrice: 2000,
        stopRule: 'whiteLine',
        isLuZhu: true,
      });
    });

    it('should normalize SELL side correctly', () => {
      const item: TradeImportItem = {
        symbol: 'AAPL.US',
        side: 'sell',
        quantity: 50,
        price: 180,
        tradedAt: '2024-01-15',
      };

      const result = normalizeTradeRecord(item, userId);
      expect(result?.side).toBe('SELL');
    });

    it('should return null for missing symbol', () => {
      const item: TradeImportItem = {
        symbol: '',
        side: 'BUY',
        quantity: 100,
        price: 100,
        tradedAt: '2024-01-15',
      };

      const result = normalizeTradeRecord(item, userId);
      expect(result).toBeNull();
    });

    it('should return null for zero quantity', () => {
      const item: TradeImportItem = {
        symbol: '600519',
        side: 'BUY',
        quantity: 0,
        price: 100,
        tradedAt: '2024-01-15',
      };

      const result = normalizeTradeRecord(item, userId);
      expect(result).toBeNull();
    });

    it('should return null for zero price', () => {
      const item: TradeImportItem = {
        symbol: '600519',
        side: 'BUY',
        quantity: 100,
        price: 0,
        tradedAt: '2024-01-15',
      };

      const result = normalizeTradeRecord(item, userId);
      expect(result).toBeNull();
    });

    it('should handle string quantity and price', () => {
      const item: TradeImportItem = {
        symbol: '600519',
        side: 'BUY',
        quantity: '100',
        price: '1800.50',
        tradedAt: '2024-01-15',
      };

      const result = normalizeTradeRecord(item, userId);
      expect(result?.quantity).toBe(100);
      expect(result?.price).toBe(1800.5);
    });

    it('should handle null optional fields', () => {
      const item: TradeImportItem = {
        symbol: '600519',
        side: 'BUY',
        quantity: 100,
        price: 1800,
        tradedAt: '2024-01-15',
        stopLossPrice: null,
        takeProfitPrice: null,
        stopRule: null,
      };

      const result = normalizeTradeRecord(item, userId);
      expect(result?.stopLossPrice).toBeNull();
      expect(result?.takeProfitPrice).toBeNull();
      expect(result?.stopRule).toBeNull();
    });
  });
});
