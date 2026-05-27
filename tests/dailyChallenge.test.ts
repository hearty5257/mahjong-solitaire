import { describe, it, expect } from 'vitest';
import {
  dailySeedFromDate,
  todayDateStr,
} from '../src/game/dailyChallenge';

describe('dailyChallenge seed', () => {
  it('todayDateStr 為 YYYY-MM-DD 形式', () => {
    const s = todayDateStr(new Date('2026-05-27T10:00:00Z'));
    expect(s).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('相同日期 → 相同 seed', () => {
    expect(dailySeedFromDate('2026-05-27')).toBe(dailySeedFromDate('2026-05-27'));
  });

  it('不同日期 → 不同 seed', () => {
    const a = dailySeedFromDate('2026-05-27');
    const b = dailySeedFromDate('2026-05-28');
    expect(a).not.toBe(b);
  });

  it('seed 為非負 32-bit', () => {
    const s = dailySeedFromDate('2099-12-31');
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThan(2 ** 32);
  });
});
