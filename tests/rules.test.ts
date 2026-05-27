import { describe, it, expect } from 'vitest';
import type { Tile, BoardState } from '../src/game/types';
import {
  canMatch,
  isTileFree,
  isCoveredAbove,
  isLeftBlocked,
  isRightBlocked,
  removePair,
  getAvailableMatches,
  isWin,
  isStuck,
} from '../src/game/rules';

function t(id: number, type: string, x: number, y: number, z: number, removed = false): Tile {
  return { id, tileType: type, x, y, z, removed };
}

describe('canMatch', () => {
  it('相同 tileType 可配對', () => {
    expect(canMatch(t(0, 'dot-1', 0, 0, 0), t(1, 'dot-1', 4, 0, 0))).toBe(true);
  });
  it('不同 tileType 不可配對', () => {
    expect(canMatch(t(0, 'dot-1', 0, 0, 0), t(1, 'dot-2', 4, 0, 0))).toBe(false);
  });
  it('同一張牌不能與自己配對', () => {
    const a = t(0, 'dot-1', 0, 0, 0);
    expect(canMatch(a, a)).toBe(false);
  });
  it('已移除的牌不可配對', () => {
    expect(canMatch(t(0, 'dot-1', 0, 0, 0, true), t(1, 'dot-1', 4, 0, 0))).toBe(false);
  });
});

describe('isTileFree', () => {
  it('沒有覆蓋且左右開放：可移動', () => {
    const board: BoardState = [t(0, 'dot-1', 0, 0, 0)];
    expect(isTileFree(board[0], board)).toBe(true);
  });

  it('上方有牌覆蓋：不可移動', () => {
    const a = t(0, 'dot-1', 0, 0, 0);
    const b = t(1, 'dot-2', 0, 0, 1);
    const board = [a, b];
    expect(isCoveredAbove(a, board)).toBe(true);
    expect(isTileFree(a, board)).toBe(false);
  });

  it('左側被擋住但右側開放：可移動', () => {
    const left = t(0, 'dot-1', 0, 0, 0);   // 占 x∈[0,2)
    const middle = t(1, 'dot-2', 2, 0, 0); // 占 x∈[2,4)
    const board = [left, middle];
    expect(isLeftBlocked(middle, board)).toBe(true);
    expect(isRightBlocked(middle, board)).toBe(false);
    expect(isTileFree(middle, board)).toBe(true);
  });

  it('右側被擋住但左側開放：可移動', () => {
    const middle = t(0, 'dot-1', 2, 0, 0);
    const right = t(1, 'dot-2', 4, 0, 0);
    const board = [middle, right];
    expect(isLeftBlocked(middle, board)).toBe(false);
    expect(isRightBlocked(middle, board)).toBe(true);
    expect(isTileFree(middle, board)).toBe(true);
  });

  it('左右都被擋住：不可移動', () => {
    const left = t(0, 'dot-1', 0, 0, 0);
    const middle = t(1, 'dot-2', 2, 0, 0);
    const right = t(2, 'dot-3', 4, 0, 0);
    const board = [left, middle, right];
    expect(isTileFree(middle, board)).toBe(false);
  });

  it('左右都被擋住但鄰居被移除：可移動', () => {
    const left = t(0, 'dot-1', 0, 0, 0, true);
    const middle = t(1, 'dot-2', 2, 0, 0);
    const right = t(2, 'dot-3', 4, 0, 0);
    const board = [left, middle, right];
    expect(isTileFree(middle, board)).toBe(true);
  });
});

describe('removePair', () => {
  it('合法配對：成功移除', () => {
    const board: BoardState = [t(0, 'dot-1', 0, 0, 0), t(1, 'dot-1', 4, 0, 0)];
    const next = removePair(0, 1, board);
    expect(next).not.toBeNull();
    expect(next!.every((x) => x.removed)).toBe(true);
    // 原 board 不變
    expect(board.every((x) => !x.removed)).toBe(true);
  });

  it('不可配對：回 null', () => {
    const board: BoardState = [t(0, 'dot-1', 0, 0, 0), t(1, 'dot-2', 4, 0, 0)];
    expect(removePair(0, 1, board)).toBeNull();
  });

  it('其中一張不可移動：回 null', () => {
    // 三張連在一起，中間 t1 被夾
    const board: BoardState = [
      t(0, 'dot-1', 0, 0, 0),
      t(1, 'dot-2', 2, 0, 0),
      t(2, 'dot-2', 4, 0, 0),
    ];
    // t1 不可移動，與 t2 同牌但 t1 卡住
    expect(removePair(1, 2, board)).toBeNull();
  });
});

describe('getAvailableMatches', () => {
  it('能列出至少一組合法可配對', () => {
    const board: BoardState = [
      t(0, 'dot-1', 0, 0, 0),
      t(1, 'dot-1', 4, 0, 0),
      t(2, 'dot-2', 8, 0, 0),
    ];
    const pairs = getAvailableMatches(board);
    expect(pairs.length).toBeGreaterThan(0);
    expect(pairs.some(([a, b]) => (a === 0 && b === 1) || (a === 1 && b === 0))).toBe(true);
  });

  it('被覆蓋的牌不會出現在可用配對', () => {
    const board: BoardState = [
      t(0, 'dot-1', 0, 0, 0),
      t(1, 'dot-1', 0, 0, 1), // 沒有 dot-1 配對對象自由 → 只有 t1 自由
    ];
    const pairs = getAvailableMatches(board);
    expect(pairs.length).toBe(0);
  });
});

describe('isWin / isStuck', () => {
  it('全部移除為勝利', () => {
    const board: BoardState = [t(0, 'dot-1', 0, 0, 0, true), t(1, 'dot-1', 4, 0, 0, true)];
    expect(isWin(board)).toBe(true);
    expect(isStuck(board)).toBe(false);
  });

  it('無可用配對為卡關', () => {
    const board: BoardState = [
      t(0, 'dot-1', 0, 0, 0),
      t(1, 'dot-2', 4, 0, 0),
    ];
    expect(isWin(board)).toBe(false);
    expect(isStuck(board)).toBe(true);
  });

  it('仍有可用配對：非卡關', () => {
    const board: BoardState = [
      t(0, 'dot-1', 0, 0, 0),
      t(1, 'dot-1', 4, 0, 0),
    ];
    expect(isStuck(board)).toBe(false);
  });
});
