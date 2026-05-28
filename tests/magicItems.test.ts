import { describe, it, expect } from 'vitest';
import type { GameState, Tile } from '../src/game/types';
import {
  INITIAL_ITEMS,
  consumeItem,
  totalAvailable,
  useBomb,
  useHint,
  useReveal,
  useShuffle,
  useUndo,
  useUnseal,
} from '../src/game/magicItems';
import { mulberry32 } from '../src/game/rng';
import { EMPTY_INVENTORY } from '../src/game/inventory';
import { remainingCount } from '../src/game/rules';

function t(id: number, type: string, x: number, y: number, z: number, removed = false): Tile {
  return { id, tileType: type, x, y, z, removed };
}

function makeState(board: Tile[]): GameState {
  return {
    board,
    selectedId: null,
    hintIds: null,
    score: 500,
    moves: 0,
    startTimeMs: 0,
    endTimeMs: null,
    status: 'playing',
    items: { ...INITIAL_ITEMS },
    inventory: { ...EMPTY_INVENTORY },
    history: [],
    combo: 0,
    lastClearMs: 0,
    difficulty: 'normal',
    seed: 1,
    message: null,
    layoutKey: 'turtle',
    layoutName: '經典龜形',
    mirror: false,
    itemsUsedInGame: 0,
    lastReward: null,
    roundModifier: 'none',
    pairsSinceUnfreeze: 0,
    keysRemaining: 0,
    maxCombo: 0,
    isDailyChallenge: false,
  };
}

describe('consumeItem / totalAvailable', () => {
  it('優先消耗 items，items 為 0 時消耗 inventory', () => {
    const items = { ...INITIAL_ITEMS, hint: 1 };
    const inv = { ...EMPTY_INVENTORY, hint: 2 };

    const r1 = consumeItem(items, inv, 'hint')!;
    expect(r1.items.hint).toBe(0);
    expect(r1.inventory.hint).toBe(2); // inventory 沒動

    const r2 = consumeItem(r1.items, r1.inventory, 'hint')!;
    expect(r2.items.hint).toBe(0);
    expect(r2.inventory.hint).toBe(1); // 改吃 inventory

    expect(totalAvailable(r2.items, r2.inventory, 'hint')).toBe(1);
  });

  it('items 與 inventory 都為 0 時回 null（不會出現負數）', () => {
    const items = { ...INITIAL_ITEMS, hint: 0 };
    const inv = { ...EMPTY_INVENTORY, hint: 0 };
    expect(consumeItem(items, inv, 'hint')).toBeNull();
  });
});

describe('useHint', () => {
  it('Hint 後次數減一，不消除任何牌', () => {
    const state = makeState([t(0, 'dot-1', 0, 0, 0), t(1, 'dot-1', 4, 0, 0)]);
    const r = useHint(state);
    expect(r.changed).toBe(true);
    expect(r.state.items.hint).toBe(state.items.hint - 1);
    expect(r.state.hintIds).not.toBeNull();
    expect(r.state.hintIds!.length).toBe(2);
    expect(remainingCount(r.state.board)).toBe(remainingCount(state.board));
  });

  it('items=0 但 inventory>0：消耗 inventory', () => {
    const state = makeState([t(0, 'dot-1', 0, 0, 0), t(1, 'dot-1', 4, 0, 0)]);
    state.items.hint = 0;
    state.inventory.hint = 2;
    const r = useHint(state);
    expect(r.changed).toBe(true);
    expect(r.state.items.hint).toBe(0);
    expect(r.state.inventory.hint).toBe(1);
  });

  it('沒有可配對時不消耗次數', () => {
    const state = makeState([t(0, 'dot-1', 0, 0, 0), t(1, 'dot-2', 4, 0, 0)]);
    const r = useHint(state);
    expect(r.changed).toBe(false);
    expect(r.state.items.hint).toBe(state.items.hint);
  });
});

describe('useBomb (炸彈)', () => {
  it('炸掉指定的牌 + 隨機選同牌面一張', () => {
    const state = makeState([
      t(0, 'dot-1', 0, 0, 0), t(1, 'dot-1', 4, 0, 0),
      t(2, 'dot-2', 8, 0, 0), t(3, 'dot-2', 12, 0, 0),
    ]);
    const r = useBomb(state, 0, mulberry32(7)); // 炸 t0 (dot-1)
    expect(r.changed).toBe(true);
    expect(remainingCount(state.board) - remainingCount(r.state.board)).toBe(2);
    expect(r.state.board.find((x) => x.id === 0)?.removed).toBe(true);
    // 另一張被炸的牌也是 dot-1
    const otherRemoved = r.state.board.filter((x) => x.id !== 0 && x.removed);
    expect(otherRemoved.length).toBe(1);
    expect(otherRemoved[0].tileType).toBe('dot-1');
  });

  it('可以炸冰封 / 鎖鏈牌（繞過 isMatchable）', () => {
    const state = makeState([
      { ...t(0, 'dot-1', 0, 0, 0), modifier: 'frozen' },
      { ...t(1, 'dot-1', 4, 0, 0), modifier: 'locked' },
    ]);
    const r = useBomb(state, 0, mulberry32(7));
    expect(r.changed).toBe(true);
    expect(r.state.board.find((x) => x.id === 0)?.removed).toBe(true);
    expect(r.state.board.find((x) => x.id === 1)?.removed).toBe(true);
  });

  it('沒有同牌面其他牌可炸：不消耗次數', () => {
    const state = makeState([
      t(0, 'dot-1', 0, 0, 0),
      t(1, 'dot-2', 4, 0, 0),
    ]);
    const r = useBomb(state, 0, mulberry32(7));
    expect(r.changed).toBe(false);
    expect(r.state.items.magicRemove).toBe(state.items.magicRemove);
  });

  it('次數用完時不可使用', () => {
    const state = makeState([t(0, 'dot-1', 0, 0, 0), t(1, 'dot-1', 4, 0, 0)]);
    state.items.magicRemove = 0;
    const r = useBomb(state, 0, mulberry32(1));
    expect(r.changed).toBe(false);
  });
});

describe('useShuffle', () => {
  it('不改變剩餘牌數', () => {
    const state = makeState([
      t(0, 'dot-1', 0, 0, 0), t(1, 'dot-2', 4, 0, 0),
      t(2, 'dot-3', 8, 0, 0), t(3, 'dot-4', 12, 0, 0),
    ]);
    const r = useShuffle(state);
    expect(r.changed).toBe(true);
    expect(remainingCount(r.state.board)).toBe(remainingCount(state.board));
  });
});

describe('useUndo', () => {
  it('可回復剛剛的炸彈消除，並還原 inventory 狀態', () => {
    const state = makeState([
      t(0, 'dot-1', 0, 0, 0), t(1, 'dot-1', 4, 0, 0),
      t(2, 'dot-2', 8, 0, 0), t(3, 'dot-2', 12, 0, 0),
    ]);
    const r1 = useBomb(state, 0, mulberry32(7));
    expect(remainingCount(r1.state.board)).toBe(2);
    const r2 = useUndo(r1.state);
    expect(r2.changed).toBe(true);
    expect(remainingCount(r2.state.board)).toBe(4);
    expect(r2.state.items.magicRemove).toBe(state.items.magicRemove);
  });

  it('Undo 還原 modifier 狀態（board snapshot）', () => {
    const state = makeState([
      { ...t(0, 'dot-1', 0, 0, 0), modifier: 'frozen' },
      t(1, 'dot-2', 4, 0, 0), t(2, 'dot-2', 8, 0, 0),
    ]);
    const r1 = useBomb(state, 1, mulberry32(7)); // 炸 t1 + t2 (dot-2)
    expect(remainingCount(r1.state.board)).toBe(1); // 只剩 t0 (frozen)
    const r2 = useUndo(r1.state);
    // t1 / t2 應該回來，且 t0 仍為 frozen
    expect(remainingCount(r2.state.board)).toBe(3);
    expect(r2.state.board.find((x) => x.id === 0)?.modifier).toBe('frozen');
  });

  it('沒有歷史紀錄時不可用', () => {
    const state = makeState([t(0, 'dot-1', 0, 0, 0), t(1, 'dot-1', 4, 0, 0)]);
    const r = useUndo(state);
    expect(r.changed).toBe(false);
  });
});

describe('useReveal', () => {
  it('翻開所有 fog 牌（設 revealed=true）', () => {
    const state = makeState([
      { ...t(0, 'dot-1', 0, 0, 0), modifier: 'fog' },
      { ...t(1, 'dot-2', 4, 0, 0), modifier: 'fog' },
      t(2, 'dot-3', 8, 0, 0),
    ]);
    const r = useReveal(state);
    expect(r.changed).toBe(true);
    expect(r.state.board.filter((x) => x.modifier === 'fog' && x.revealed).length).toBe(2);
    expect(r.state.items.reveal).toBe(state.items.reveal - 1);
  });

  it('沒有迷霧牌時不消耗次數', () => {
    const state = makeState([t(0, 'dot-1', 0, 0, 0)]);
    const r = useReveal(state);
    expect(r.changed).toBe(false);
  });
});

describe('useUnseal', () => {
  it('解除 1 張冰封牌（優先 frozen）', () => {
    const state = makeState([
      { ...t(0, 'dot-1', 0, 0, 0), modifier: 'frozen' },
      { ...t(1, 'dot-2', 4, 0, 0), modifier: 'locked' },
    ]);
    const r = useUnseal(state);
    expect(r.changed).toBe(true);
    const frozenLeft = r.state.board.filter((x) => x.modifier === 'frozen').length;
    expect(frozenLeft).toBe(0);
    // locked 還在
    expect(r.state.board.find((x) => x.id === 1)?.modifier).toBe('locked');
  });

  it('沒有冰封 / 鎖鏈時不消耗次數', () => {
    const state = makeState([t(0, 'dot-1', 0, 0, 0)]);
    const r = useUnseal(state);
    expect(r.changed).toBe(false);
  });
});
