import { describe, it, expect } from 'vitest';
import { getLayoutByKey, getTurtleLayout, LAYOUT_KEYS, LAYOUTS, pickLayoutKey } from '../src/game/layout';
import { buildStandardDeck } from '../src/game/tiles';

describe('layout', () => {
  it('Turtle 為 136 張', () => {
    expect(getTurtleLayout().length).toBe(136);
  });

  it('所有牌型牌位數為偶數（可成對）', () => {
    for (const key of LAYOUT_KEYS) {
      const slots = getLayoutByKey(key);
      expect(slots.length % 2).toBe(0);
    }
  });

  it('所有牌型牌位數 ≤ 牌組數量 (136)', () => {
    for (const key of LAYOUT_KEYS) {
      expect(getLayoutByKey(key).length).toBeLessThanOrEqual(buildStandardDeck().length);
    }
  });

  it('每個牌型沒有兩張牌位於完全相同 (x,y,z)', () => {
    for (const key of LAYOUT_KEYS) {
      const slots = getLayoutByKey(key);
      const seen = new Set<string>();
      for (const s of slots) {
        const k = `${s.x},${s.y},${s.z}`;
        expect(seen.has(k)).toBe(false);
        seen.add(k);
      }
    }
  });

  it('mirror 為水平對稱，牌數與原始相同', () => {
    for (const key of LAYOUT_KEYS) {
      const a = getLayoutByKey(key);
      const b = getLayoutByKey(key, { mirror: true });
      expect(b.length).toBe(a.length);
    }
  });

  it('pickLayoutKey 為確定性', () => {
    expect(pickLayoutKey(0)).toBe(pickLayoutKey(0));
    expect(pickLayoutKey(42)).toBe(pickLayoutKey(42));
  });

  it('easy 難度只會抽到 turtle', () => {
    for (let i = 0; i < 30; i++) {
      expect(pickLayoutKey(i * 11, 'easy')).toBe('turtle');
    }
  });

  it('normal 難度不會出現 bridge / spiral', () => {
    const allowed = new Set(['turtle', 'pyramid', 'twinTowers']);
    for (let i = 0; i < 50; i++) {
      expect(allowed.has(pickLayoutKey(i, 'normal'))).toBe(true);
    }
  });

  it('hard 難度可以涵蓋全部 5 種', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) seen.add(pickLayoutKey(i, 'hard'));
    expect(seen.size).toBe(5);
  });

  it('LAYOUTS 完整對應 5 種牌型', () => {
    expect(LAYOUT_KEYS.length).toBe(5);
    for (const k of LAYOUT_KEYS) {
      expect(LAYOUTS[k]).toBeDefined();
      expect(LAYOUTS[k].name.length).toBeGreaterThan(0);
    }
  });
});
