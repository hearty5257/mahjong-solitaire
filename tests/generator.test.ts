import { describe, it, expect } from 'vitest';
import { generateGame, shuffleRemainingTiles, mulberry32 } from '../src/game/generator';
import { getAvailableMatches, remainingCount } from '../src/game/rules';
import { LAYOUT_KEYS } from '../src/game/layout';

describe('generator', () => {
  it('產生的牌局牌數為偶數（可成對）', () => {
    const { board } = generateGame({ seed: 42, difficulty: 'normal' });
    expect(board.length % 2).toBe(0);
  });

  it('開局至少有一組可用配對 (normal)', () => {
    const { board } = generateGame({ seed: 42, difficulty: 'normal' });
    expect(getAvailableMatches(board).length).toBeGreaterThan(0);
  });

  it('相同 seed + 難度 → 相同牌局', () => {
    const a = generateGame({ seed: 12345, difficulty: 'normal' });
    const b = generateGame({ seed: 12345, difficulty: 'normal' });
    expect(a.board.map((t) => t.tileType)).toEqual(b.board.map((t) => t.tileType));
    expect(a.layoutKey).toBe(b.layoutKey);
    expect(a.mirror).toBe(b.mirror);
  });

  it('mulberry32 為確定性 PRNG', () => {
    const r1 = mulberry32(1);
    const r2 = mulberry32(1);
    for (let i = 0; i < 5; i++) expect(r1()).toBe(r2());
  });

  it('指定 layoutKey 時使用該牌型', () => {
    for (const key of LAYOUT_KEYS) {
      const r = generateGame({ seed: 7, difficulty: 'normal', layoutKey: key });
      expect(r.layoutKey).toBe(key);
    }
  });

  it('每種牌型開局都有可用配對 (normal)', () => {
    for (const key of LAYOUT_KEYS) {
      const { board } = generateGame({ seed: 99, difficulty: 'normal', layoutKey: key });
      expect(getAvailableMatches(board).length).toBeGreaterThan(0);
    }
  });
});

describe('shuffleRemainingTiles', () => {
  it('不改變剩餘牌數', () => {
    const { board } = generateGame({ seed: 7, difficulty: 'normal' });
    const before = remainingCount(board);
    const shuffled = shuffleRemainingTiles(board, 999);
    expect(remainingCount(shuffled)).toBe(before);
  });

  it('不改變位置與層數', () => {
    const { board } = generateGame({ seed: 7, difficulty: 'normal' });
    const shuffled = shuffleRemainingTiles(board, 999);
    for (let i = 0; i < board.length; i++) {
      expect(shuffled[i].id).toBe(board[i].id);
      expect(shuffled[i].x).toBe(board[i].x);
      expect(shuffled[i].y).toBe(board[i].y);
      expect(shuffled[i].z).toBe(board[i].z);
      expect(shuffled[i].removed).toBe(board[i].removed);
    }
  });

  it('剩餘牌的「牌面組成」維持不變 (multiset)', () => {
    const { board } = generateGame({ seed: 7, difficulty: 'normal' });
    const shuffled = shuffleRemainingTiles(board, 999);
    const sortKey = (arr: string[]) => arr.slice().sort().join(',');
    expect(sortKey(shuffled.filter((t) => !t.removed).map((t) => t.tileType)))
      .toBe(sortKey(board.filter((t) => !t.removed).map((t) => t.tileType)));
  });

  it('盡量保證重排後有可用配對', () => {
    const { board } = generateGame({ seed: 7, difficulty: 'normal' });
    const shuffled = shuffleRemainingTiles(board, 999);
    expect(getAvailableMatches(shuffled).length).toBeGreaterThan(0);
  });
});
