import { LongBridgeClient } from '../../src/lib/longbridge';
import { Config, QuoteContext } from 'longport';

jest.mock('longport', () => ({
  Config: {
    fromEnv: jest.fn().mockReturnValue({}),
  },
  QuoteContext: {
    new: jest.fn().mockResolvedValue({
      candlesticks: jest.fn().mockResolvedValue([
        {
          close: { toNumber: () => 10.5 },
          high: { toNumber: () => 11.0 },
          low: { toNumber: () => 10.0 },
          timestamp: new Date('2024-02-15'),
        },
        {
          close: { toNumber: () => 11.0 },
          high: { toNumber: () => 11.5 },
          low: { toNumber: () => 10.5 },
          timestamp: new Date('2024-02-16'),
        },
      ]),
    }),
  },
  Period: {
    Day: '1d',
  },
  AdjustType: {
    NoAdjust: 0,
  },
}));

describe('LongBridgeClient', () => {
  let client: LongBridgeClient;

  beforeEach(() => {
    client = new LongBridgeClient();
  });

  describe('getKLineData', () => {
    it('should fetch and transform K-line data correctly', async () => {
      const result = await client.getKLineData('600000');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        close: 10.5,
        high: 11.0,
        low: 10.0,
        timestamp: new Date('2024-02-15').getTime(),
      });
    });
  });

  describe('calculateKDJ', () => {
    it('should calculate KDJ indicators correctly', async () => {
      const result = await client.calculateKDJ('600000');

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('k');
      expect(result[0]).toHaveProperty('d');
      expect(result[0]).toHaveProperty('j');

      // 验证 KDJ 的计算逻辑
      expect(result[0].k).toBeGreaterThan(0);
      expect(result[0].k).toBeLessThan(100);
      expect(result[0].d).toBeGreaterThan(0);
      expect(result[0].d).toBeLessThan(100);
    });
  });
});
