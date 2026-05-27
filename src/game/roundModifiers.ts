import type { BoardState, Difficulty, RoundModifier, Tile, TileType } from './types';
import { mulberry32 } from './rng';
import { isTileFree } from './rules';

// 每多少組消除自動解凍 1 張
export const FROZEN_THAW_PERIOD = 3;

// 各 modifier 預設「總數」配置（依牌局大小自動縮放）
const FOG_RATIO = 0.30;     // 30% 牌被迷霧
const FROZEN_RATIO = 0.12;  // 12% 牌被冰封
const KEY_PAIRS = 2;        // 2 對鑰匙（4 張）
const LOCKED_COUNT = 6;     // 6 張上鎖

export const ROUND_MODIFIER_NAMES: Record<RoundModifier, string> = {
  none: '無',
  fog: '迷霧局',
  frozen: '冰封牌',
  keyLock: '鑰匙與鎖鏈',
};

// 根據 seed + 難度挑一個 round modifier
// 只有 hard 會出現特殊牌局；easy / normal 永遠為 none
// hard：1/4 none、其餘均分 fog / frozen / keyLock
export function pickRoundModifier(seed: number, difficulty: Difficulty): RoundModifier {
  if (difficulty !== 'hard') return 'none';
  const rand = mulberry32(seed ^ 0xc0ffee);
  const roll = rand();
  if (roll < 0.25) return 'none';
  if (roll < 0.50) return 'fog';
  if (roll < 0.75) return 'frozen';
  return 'keyLock';
}

// 套用 round modifier 到既有 board，回傳新 board + round 初始狀態
export interface ApplyResult {
  board: BoardState;
  keysRemaining: number;
}

export function applyRoundModifier(
  board: BoardState,
  modifier: RoundModifier,
  seed: number,
): ApplyResult {
  if (modifier === 'none') return { board, keysRemaining: 0 };
  const rand = mulberry32(seed ^ 0x5a17e7);

  switch (modifier) {
    case 'fog': return applyFog(board, rand);
    case 'frozen': return applyFrozen(board, rand);
    case 'keyLock': return applyKeyLock(board, rand);
  }
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// 迷霧：隨機選 ~30% 的牌標記為 fog
// 確保「初始可移動」的牌至少保留若干張不被霧化（避免一打開全是霧而失去基本辨識）
function applyFog(board: BoardState, rand: () => number): ApplyResult {
  const total = board.length;
  const targetCount = Math.floor(total * FOG_RATIO);

  // 初始可移動的牌一律不霧化（不然玩家完全沒線索）
  const freeIds = new Set<number>();
  for (const t of board) if (!t.removed && isTileFree(t, board)) freeIds.add(t.id);

  const candidates = board.filter((t) => !t.removed && !freeIds.has(t.id));
  const picked = shuffle(candidates, rand).slice(0, targetCount);
  const fogIds = new Set(picked.map((t) => t.id));

  return {
    board: board.map((t) => fogIds.has(t.id) ? { ...t, modifier: 'fog' as const } : t),
    keysRemaining: 0,
  };
}

// 冰封：隨機選 ~12% 的牌標記為 frozen
// 限制：不冰封「初始可移動」的牌，避免開局無法操作
function applyFrozen(board: BoardState, rand: () => number): ApplyResult {
  const total = board.length;
  const targetCount = Math.floor(total * FROZEN_RATIO);

  const freeIds = new Set<number>();
  for (const t of board) if (!t.removed && isTileFree(t, board)) freeIds.add(t.id);

  const candidates = board.filter((t) => !t.removed && !freeIds.has(t.id));
  const picked = shuffle(candidates, rand).slice(0, targetCount);
  const frozenIds = new Set(picked.map((t) => t.id));

  return {
    board: board.map((t) => frozenIds.has(t.id) ? { ...t, modifier: 'frozen' as const } : t),
    keysRemaining: 0,
  };
}

// 鑰匙與鎖鏈：
//  - 從「初始可移動」的牌中挑出 KEY_PAIRS 對作為 key
//  - 從其他位置挑 LOCKED_COUNT 張作為 lock
function applyKeyLock(board: BoardState, rand: () => number): ApplyResult {
  // 找出「初始可移動」並建立 tileType 對應 ids
  const freeByType = new Map<TileType, Tile[]>();
  for (const t of board) {
    if (t.removed) continue;
    if (!isTileFree(t, board)) continue;
    const list = freeByType.get(t.tileType) ?? [];
    list.push(t);
    freeByType.set(t.tileType, list);
  }

  // 只考慮「有 >=2 張可移動」的 tileType 作為 key candidate
  const keyCandidateTypes = Array.from(freeByType.entries())
    .filter(([, list]) => list.length >= 2)
    .map(([type]) => type);

  const shuffled = shuffle(keyCandidateTypes, rand);
  const keyTypes = shuffled.slice(0, KEY_PAIRS);
  const keyIds = new Set<number>();
  for (const type of keyTypes) {
    const list = freeByType.get(type)!;
    const picked = shuffle(list, rand).slice(0, 2); // 每種 type 取 2 張
    for (const tile of picked) keyIds.add(tile.id);
  }

  // 鎖鏈：從非 key、非 free 的牌挑
  const lockCandidates = board.filter(
    (t) => !t.removed && !keyIds.has(t.id) && !isTileFree(t, board),
  );
  const lockPicked = shuffle(lockCandidates, rand).slice(0, LOCKED_COUNT);
  const lockIds = new Set(lockPicked.map((t) => t.id));

  return {
    board: board.map((t) => {
      if (keyIds.has(t.id)) return { ...t, modifier: 'key' as const };
      if (lockIds.has(t.id)) return { ...t, modifier: 'locked' as const };
      return t;
    }),
    keysRemaining: keyIds.size / 2, // 配對數
  };
}

// 解凍：從「目前被冰封」的牌中挑 1 張解凍
// 優先選擇「若解凍後可移動」的牌，否則隨機選
export function thawOneFrozen(board: BoardState): BoardState {
  const frozen = board.filter((t) => !t.removed && t.modifier === 'frozen');
  if (frozen.length === 0) return board;

  // 先試找解凍後就可移動的
  for (const t of frozen) {
    if (isTileFree(t, board)) {
      return board.map((x) => x.id === t.id ? { ...x, modifier: undefined } : x);
    }
  }
  // 否則挑第一張
  const target = frozen[0];
  return board.map((x) => x.id === target.id ? { ...x, modifier: undefined } : x);
}

// 解鎖所有 locked 牌（鑰匙全消後）
export function unlockAllLocked(board: BoardState): BoardState {
  return board.map((t) => (t.modifier === 'locked' ? { ...t, modifier: undefined } : t));
}

// 處理「消除一對牌」後可能觸發的 modifier 事件：
//   - frozen 模式：pairsSinceUnfreeze + 1，達 FROZEN_THAW_PERIOD 時解凍 1 張
//   - keyLock 模式：若該配對是 key 對，keysRemaining - 1；歸零時解鎖所有 lock
// 回傳：新 board 與新 round state
export function postPairEffects(
  board: BoardState,
  removedAId: number,
  removedBId: number,
  modifier: RoundModifier,
  prevPairsSinceUnfreeze: number,
  prevKeysRemaining: number,
): { board: BoardState; pairsSinceUnfreeze: number; keysRemaining: number; event: string | null } {
  let newBoard = board;
  let pairs = prevPairsSinceUnfreeze;
  let keys = prevKeysRemaining;
  let event: string | null = null;

  if (modifier === 'frozen') {
    pairs += 1;
    if (pairs >= FROZEN_THAW_PERIOD) {
      pairs = 0;
      const before = newBoard.filter((t) => t.modifier === 'frozen').length;
      newBoard = thawOneFrozen(newBoard);
      const after = newBoard.filter((t) => t.modifier === 'frozen').length;
      if (before > after) event = '解凍 1 張冰封牌';
    }
  }

  if (modifier === 'keyLock') {
    const removedA = board.find((t) => t.id === removedAId);
    const removedB = board.find((t) => t.id === removedBId);
    if (removedA?.modifier === 'key' && removedB?.modifier === 'key') {
      keys = Math.max(0, keys - 1);
      if (keys === 0) {
        newBoard = unlockAllLocked(newBoard);
        event = '所有鎖鏈解開！';
      } else {
        event = `鑰匙生效，剩餘 ${keys} 對鑰匙`;
      }
    }
  }

  return { board: newBoard, pairsSinceUnfreeze: pairs, keysRemaining: keys, event };
}
