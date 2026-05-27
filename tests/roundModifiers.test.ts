import { describe, it, expect } from 'vitest';
import type { BoardState, Tile } from '../src/game/types';
import {
  applyRoundModifier,
  pickRoundModifier,
  postPairEffects,
  thawOneFrozen,
  unlockAllLocked,
  FROZEN_THAW_PERIOD,
} from '../src/game/roundModifiers';
import { canMatch, getAvailableMatches, isMatchable } from '../src/game/rules';
import { generateGame } from '../src/game/generator';

function t(id: number, type: string, x: number, y: number, z: number, removed = false): Tile {
  return { id, tileType: type, x, y, z, removed };
}

describe('pickRoundModifier', () => {
  it('easy 永遠為 none', () => {
    for (let i = 0; i < 30; i++) {
      expect(pickRoundModifier(i * 17, 'easy')).toBe('none');
    }
  });
  it('normal 永遠為 none（只有 hard 會出現特殊牌局）', () => {
    for (let i = 0; i < 50; i++) {
      expect(pickRoundModifier(i * 13, 'normal')).toBe('none');
    }
  });
  it('hard 至少出現過 fog / frozen / keyLock 之一', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) seen.add(pickRoundModifier(i, 'hard'));
    expect(seen.has('fog')).toBe(true);
    expect(seen.has('frozen')).toBe(true);
    expect(seen.has('keyLock')).toBe(true);
  });
  it('確定性：相同 seed + 難度 → 相同結果', () => {
    expect(pickRoundModifier(42, 'hard')).toBe(pickRoundModifier(42, 'hard'));
  });
});

describe('isMatchable / canMatch with modifiers', () => {
  it('frozen 牌不可配對', () => {
    const a: Tile = { ...t(0, 'dot-1', 0, 0, 0), modifier: 'frozen' };
    const b = t(1, 'dot-1', 4, 0, 0);
    expect(isMatchable(a)).toBe(false);
    expect(canMatch(a, b)).toBe(false);
  });
  it('locked 牌不可配對', () => {
    const a: Tile = { ...t(0, 'dot-1', 0, 0, 0), modifier: 'locked' };
    const b = t(1, 'dot-1', 4, 0, 0);
    expect(canMatch(a, b)).toBe(false);
  });
  it('fog 與 key 牌可配對（仍可消除）', () => {
    const a: Tile = { ...t(0, 'dot-1', 0, 0, 0), modifier: 'fog' };
    const b: Tile = { ...t(1, 'dot-1', 4, 0, 0), modifier: 'key' };
    expect(canMatch(a, b)).toBe(true);
  });
});

describe('applyRoundModifier', () => {
  it('套用 fog 後仍有可用配對（不會冰封掉所有初始可移動牌）', () => {
    const { board } = generateGame({ seed: 100, difficulty: 'normal', roundModifier: 'fog' });
    expect(getAvailableMatches(board).length).toBeGreaterThan(0);
    const fogCount = board.filter((t) => t.modifier === 'fog').length;
    expect(fogCount).toBeGreaterThan(0);
  });
  it('套用 frozen 後仍有可用配對', () => {
    const { board } = generateGame({ seed: 101, difficulty: 'normal', roundModifier: 'frozen' });
    expect(getAvailableMatches(board).length).toBeGreaterThan(0);
    expect(board.some((t) => t.modifier === 'frozen')).toBe(true);
  });
  it('套用 keyLock 後仍有可用配對，且 key / locked 標註存在', () => {
    const { board, keysRemaining } = generateGame({ seed: 102, difficulty: 'normal', roundModifier: 'keyLock' });
    expect(getAvailableMatches(board).length).toBeGreaterThan(0);
    expect(board.some((t) => t.modifier === 'key')).toBe(true);
    expect(board.some((t) => t.modifier === 'locked')).toBe(true);
    expect(keysRemaining).toBeGreaterThan(0);
  });
  it('指定 none 時不增加 modifier', () => {
    const { board } = generateGame({ seed: 103, difficulty: 'normal', roundModifier: 'none' });
    expect(board.every((t) => !t.modifier)).toBe(true);
  });
});

describe('postPairEffects: frozen 模式每 N 組解凍 1 張', () => {
  it(`每 ${FROZEN_THAW_PERIOD} 組消除自動解凍 1 張冰封牌`, () => {
    let board: BoardState = [
      t(0, 'dot-1', 0, 0, 0),
      t(1, 'dot-1', 4, 0, 0),
      { ...t(2, 'dot-2', 8, 0, 0), modifier: 'frozen' },
    ];
    let pairs = 0;
    for (let i = 0; i < FROZEN_THAW_PERIOD; i++) {
      const r = postPairEffects(board, 0, 1, 'frozen', pairs, 0);
      pairs = r.pairsSinceUnfreeze;
      board = r.board;
    }
    // 第 N 次後 → frozen 數量應減少
    expect(board.find((x) => x.id === 2)?.modifier).toBeUndefined();
  });
});

describe('postPairEffects: keyLock 模式消完所有鑰匙解鎖', () => {
  it('當 keysRemaining 歸零，所有 locked 牌被解鎖', () => {
    const board: BoardState = [
      { ...t(0, 'dot-1', 0, 0, 0), modifier: 'key' },
      { ...t(1, 'dot-1', 4, 0, 0), modifier: 'key' },
      { ...t(2, 'dot-2', 8, 0, 0), modifier: 'locked' },
      { ...t(3, 'dot-3', 12, 0, 0), modifier: 'locked' },
    ];
    // 假設只剩 1 對鑰匙，消除這對 → 解鎖
    const r = postPairEffects(board, 0, 1, 'keyLock', 0, 1);
    expect(r.keysRemaining).toBe(0);
    expect(r.board.find((x) => x.id === 2)?.modifier).toBeUndefined();
    expect(r.board.find((x) => x.id === 3)?.modifier).toBeUndefined();
  });
});

describe('thawOneFrozen / unlockAllLocked', () => {
  it('thawOneFrozen 只解凍一張', () => {
    const board: BoardState = [
      { ...t(0, 'dot-1', 0, 0, 0), modifier: 'frozen' },
      { ...t(1, 'dot-2', 4, 0, 0), modifier: 'frozen' },
    ];
    const r = thawOneFrozen(board);
    const remainingFrozen = r.filter((x) => x.modifier === 'frozen').length;
    expect(remainingFrozen).toBe(1);
  });
  it('unlockAllLocked 解除所有 locked', () => {
    const board: BoardState = [
      { ...t(0, 'dot-1', 0, 0, 0), modifier: 'locked' },
      { ...t(1, 'dot-2', 4, 0, 0), modifier: 'locked' },
    ];
    const r = unlockAllLocked(board);
    expect(r.every((x) => x.modifier !== 'locked')).toBe(true);
  });
});
