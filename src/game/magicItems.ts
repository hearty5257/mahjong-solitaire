import type { GameState, ItemInventory, ItemKey, MagicItemState, MoveHistoryEntry, RoundStateSnapshot } from './types';
import { getAvailableMatches, removePair } from './rules';
import { shuffleRemainingTiles } from './generator';
import { COST_HINT, COST_MAGIC_REMOVE, COST_SHUFFLE, COST_UNDO } from './scoring';
import { postPairEffects } from './roundModifiers';

// 每局起始道具次數
export const INITIAL_ITEMS: MagicItemState = {
  hint: 3,
  magicRemove: 2,
  undo: 3,
  shuffle: 1,
  reveal: 1,
  unseal: 1,
};

export const COST_REVEAL = 15;
export const COST_UNSEAL = 30;

export interface MagicResult {
  state: GameState;
  message: string | null;
  changed: boolean;
}

function cloneItems(items: MagicItemState): MagicItemState { return { ...items }; }
function cloneInventory(inv: ItemInventory): ItemInventory { return { ...inv }; }

export function consumeItem(items: MagicItemState, inv: ItemInventory, key: ItemKey):
  { items: MagicItemState; inventory: ItemInventory } | null {
  if (items[key] > 0) return { items: { ...items, [key]: items[key] - 1 }, inventory: inv };
  if (inv[key] > 0) return { items, inventory: { ...inv, [key]: inv[key] - 1 } };
  return null;
}

export function totalAvailable(items: MagicItemState, inv: ItemInventory, key: ItemKey): number {
  return items[key] + inv[key];
}

// 建立一個 history entry（snapshot 整個 board + round 狀態）
export function makeHistoryEntry(state: GameState): MoveHistoryEntry {
  const round: RoundStateSnapshot = {
    pairsSinceUnfreeze: state.pairsSinceUnfreeze,
    keysRemaining: state.keysRemaining,
  };
  return {
    boardSnapshot: state.board.map((t) => ({ ...t })),
    prevScore: state.score,
    prevCombo: state.combo,
    prevComboTime: state.lastClearMs,
    prevItems: cloneItems(state.items),
    prevInventory: cloneInventory(state.inventory),
    prevRound: round,
  };
}

// 1. 靈視提示
export function useHint(state: GameState): MagicResult {
  if (state.status !== 'playing') return { state, message: '遊戲已結束', changed: false };
  if (totalAvailable(state.items, state.inventory, 'hint') <= 0) {
    return { state, message: '靈視提示已用完', changed: false };
  }
  const pairs = getAvailableMatches(state.board);
  if (pairs.length === 0) return { state, message: '目前沒有可配對牌', changed: false };

  const consumed = consumeItem(state.items, state.inventory, 'hint')!;
  const [a, b] = pairs[0];
  const next: GameState = {
    ...state,
    items: consumed.items,
    inventory: consumed.inventory,
    hintIds: [a, b],
    score: Math.max(0, state.score - COST_HINT),
    itemsUsedInGame: state.itemsUsedInGame + 1,
    message: `提示：兩張閃光的牌可配對 (-${COST_HINT} 分)`,
  };
  return { state: next, message: next.message, changed: true };
}

// 2. 魔法消除
export function useMagicRemove(state: GameState): MagicResult {
  if (state.status !== 'playing') return { state, message: '遊戲已結束', changed: false };
  if (totalAvailable(state.items, state.inventory, 'magicRemove') <= 0) {
    return { state, message: '魔法消除已用完', changed: false };
  }
  const pairs = getAvailableMatches(state.board);
  if (pairs.length === 0) return { state, message: '目前沒有可消除的牌', changed: false };

  const [a, b] = pairs[0];
  const boardAfter = removePair(a, b, state.board);
  if (!boardAfter) return { state, message: '魔法消除失敗', changed: false };

  const consumed = consumeItem(state.items, state.inventory, 'magicRemove')!;
  const history = [...state.history, makeHistoryEntry(state)];

  // 觸發 round modifier 後續效果
  const post = postPairEffects(
    boardAfter, a, b, state.roundModifier,
    state.pairsSinceUnfreeze, state.keysRemaining,
  );

  const next: GameState = {
    ...state,
    board: post.board,
    items: consumed.items,
    inventory: consumed.inventory,
    score: Math.max(0, state.score - COST_MAGIC_REMOVE),
    history,
    moves: state.moves + 1,
    selectedId: null,
    hintIds: null,
    itemsUsedInGame: state.itemsUsedInGame + 1,
    pairsSinceUnfreeze: post.pairsSinceUnfreeze,
    keysRemaining: post.keysRemaining,
    message: post.event
      ? `魔法消除 (-${COST_MAGIC_REMOVE}) / ${post.event}`
      : `魔法消除：自動消除一組 (-${COST_MAGIC_REMOVE} 分)`,
  };
  return { state: next, message: next.message, changed: true };
}

// 3. 時光回溯：board snapshot 一次還原
export function useUndo(state: GameState): MagicResult {
  if (totalAvailable(state.items, state.inventory, 'undo') <= 0) {
    return { state, message: '時光回溯已用完', changed: false };
  }
  if (state.history.length === 0) return { state, message: '沒有可回溯的動作', changed: false };

  const last = state.history[state.history.length - 1];
  const newHistory = state.history.slice(0, -1);

  // 還原 items / inventory 再扣一次 undo
  const restoredItems = { ...last.prevItems };
  const restoredInv = { ...last.prevInventory };
  const consumed = consumeItem(restoredItems, restoredInv, 'undo');
  if (!consumed) return { state, message: '時光回溯已用完', changed: false };

  const next: GameState = {
    ...state,
    board: last.boardSnapshot.map((t) => ({ ...t })),
    score: Math.max(0, last.prevScore - COST_UNDO),
    combo: last.prevCombo,
    lastClearMs: last.prevComboTime,
    items: consumed.items,
    inventory: consumed.inventory,
    history: newHistory,
    moves: state.moves + 1,
    selectedId: null,
    hintIds: null,
    status: 'playing',
    endTimeMs: null,
    pairsSinceUnfreeze: last.prevRound.pairsSinceUnfreeze,
    keysRemaining: last.prevRound.keysRemaining,
    itemsUsedInGame: state.itemsUsedInGame + 1,
    message: `時光回溯成功 (-${COST_UNDO} 分)`,
  };
  return { state: next, message: next.message, changed: true };
}

// 4. 命運重排
export function useShuffle(state: GameState): MagicResult {
  if (state.status !== 'playing') return { state, message: '遊戲已結束', changed: false };
  if (totalAvailable(state.items, state.inventory, 'shuffle') <= 0) {
    return { state, message: '命運重排已用完', changed: false };
  }
  const newBoard = shuffleRemainingTiles(state.board, state.seed + state.moves * 17 + Date.now() % 100000);
  const consumed = consumeItem(state.items, state.inventory, 'shuffle')!;
  const history = [...state.history, makeHistoryEntry(state)];

  const next: GameState = {
    ...state,
    board: newBoard,
    items: consumed.items,
    inventory: consumed.inventory,
    score: Math.max(0, state.score - COST_SHUFFLE),
    history,
    moves: state.moves + 1,
    selectedId: null,
    hintIds: null,
    itemsUsedInGame: state.itemsUsedInGame + 1,
    message: `命運重排：剩餘牌已重新分配 (-${COST_SHUFFLE} 分)`,
  };
  return { state: next, message: next.message, changed: true };
}

// 5. 透視術 Reveal：永久翻開所有目前的迷霧牌
export function useReveal(state: GameState): MagicResult {
  if (state.status !== 'playing') return { state, message: '遊戲已結束', changed: false };
  if (totalAvailable(state.items, state.inventory, 'reveal') <= 0) {
    return { state, message: '透視術已用完', changed: false };
  }
  const targets = state.board.filter((t) => !t.removed && t.modifier === 'fog' && !t.revealed);
  if (targets.length === 0) return { state, message: '目前沒有迷霧牌', changed: false };

  const consumed = consumeItem(state.items, state.inventory, 'reveal')!;
  const newBoard = state.board.map((t) =>
    t.modifier === 'fog' && !t.revealed ? { ...t, revealed: true } : t,
  );
  const next: GameState = {
    ...state,
    board: newBoard,
    items: consumed.items,
    inventory: consumed.inventory,
    score: Math.max(0, state.score - COST_REVEAL),
    itemsUsedInGame: state.itemsUsedInGame + 1,
    message: `透視術：翻開 ${targets.length} 張迷霧牌 (-${COST_REVEAL} 分)`,
  };
  return { state: next, message: next.message, changed: true };
}

// 7. 解封術 Unseal：解除 1 張冰封或鎖鏈
export function useUnseal(state: GameState): MagicResult {
  if (state.status !== 'playing') return { state, message: '遊戲已結束', changed: false };
  if (totalAvailable(state.items, state.inventory, 'unseal') <= 0) {
    return { state, message: '解封術已用完', changed: false };
  }
  // 優先 frozen，其次 locked
  const frozen = state.board.find((t) => !t.removed && t.modifier === 'frozen');
  const locked = state.board.find((t) => !t.removed && t.modifier === 'locked');
  const target = frozen ?? locked;
  if (!target) return { state, message: '沒有可解除的牌', changed: false };

  const consumed = consumeItem(state.items, state.inventory, 'unseal')!;
  const history = [...state.history, makeHistoryEntry(state)];
  const newBoard = state.board.map((t) =>
    t.id === target.id ? { ...t, modifier: undefined } : t,
  );
  const which = target.modifier === 'frozen' ? '冰封' : '鎖鏈';
  const next: GameState = {
    ...state,
    board: newBoard,
    items: consumed.items,
    inventory: consumed.inventory,
    history,
    score: Math.max(0, state.score - COST_UNSEAL),
    itemsUsedInGame: state.itemsUsedInGame + 1,
    message: `解封術：解除 1 張${which}牌 (-${COST_UNSEAL} 分)`,
  };
  return { state: next, message: next.message, changed: true };
}
