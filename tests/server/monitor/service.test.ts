import { MonitorEvaluator } from '@/server/monitor/service';

describe('MonitorEvaluator', () => {
  let evaluator: MonitorEvaluator;

  beforeEach(() => {
    evaluator = new MonitorEvaluator();
  });

  describe('checkCondition', () => {
    it('should return true when currentValue is above threshold and condition is ABOVE', () => {
      expect(evaluator.checkCondition(100, 'ABOVE', 90)).toBe(true);
      expect(evaluator.checkCondition(100, 'ABOVE', 100)).toBe(false);
    });

    it('should return true when currentValue is below threshold and condition is BELOW', () => {
      expect(evaluator.checkCondition(80, 'BELOW', 90)).toBe(true);
      expect(evaluator.checkCondition(100, 'BELOW', 100)).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(evaluator.checkCondition(100.01, 'ABOVE', 100)).toBe(true);
      expect(evaluator.checkCondition(99.99, 'BELOW', 100)).toBe(true);
    });

    it('should handle negative values', () => {
      expect(evaluator.checkCondition(-5, 'ABOVE', -10)).toBe(true);
      expect(evaluator.checkCondition(-5, 'BELOW', 0)).toBe(true);
    });

    it('should handle zero values', () => {
      expect(evaluator.checkCondition(0, 'ABOVE', -1)).toBe(true);
      expect(evaluator.checkCondition(0, 'BELOW', 1)).toBe(true);
    });
  });
});
