import type { ExtraReward, ItemInventory, ItemKey, Rarity, RewardContext, RewardResult } from './types';

const STORAGE_KEY = 'mahjong-solitaire:inventory:v3'; // v3：移除 foresight

export const INVENTORY_CAPS: Record<ItemKey, number> = {
  hint: 9,
  undo: 9,
  reveal: 6,
  unseal: 6,
  magicRemove: 3,
  shuffle: 3,
};

export const ITEM_RARITY: Record<ItemKey, Rarity> = {
  hint: 'common',
  undo: 'common',
  reveal: 'rare',
  unseal: 'rare',
  magicRemove: 'epic',
  shuffle: 'epic',
};

export const FULL_COMPENSATION: Record<Rarity, number> = {
  common: 50,
  rare: 100,
  epic: 200,
};

const RARITY_WEIGHT: Record<Rarity, number> = {
  common: 60,
  rare: 30,
  epic: 10,
};

const ITEMS_BY_RARITY: Record<Rarity, ItemKey[]> = {
  common: ['hint', 'undo'],
  rare: ['reveal', 'unseal'],
  epic: ['magicRemove', 'shuffle'],
};

export const EMPTY_INVENTORY: ItemInventory = {
  hint: 0,
  undo: 0,
  reveal: 0,
  unseal: 0,
  magicRemove: 0,
  shuffle: 0,
};

export function loadInventory(): ItemInventory {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_INVENTORY };
    const parsed = JSON.parse(raw) as Partial<ItemInventory>;
    return {
      hint: clampInt(parsed.hint, 0, INVENTORY_CAPS.hint),
      undo: clampInt(parsed.undo, 0, INVENTORY_CAPS.undo),
      reveal: clampInt(parsed.reveal, 0, INVENTORY_CAPS.reveal),
      unseal: clampInt(parsed.unseal, 0, INVENTORY_CAPS.unseal),
      magicRemove: clampInt(parsed.magicRemove, 0, INVENTORY_CAPS.magicRemove),
      shuffle: clampInt(parsed.shuffle, 0, INVENTORY_CAPS.shuffle),
    };
  } catch {
    return { ...EMPTY_INVENTORY };
  }
}

export function saveInventory(inv: ItemInventory): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(inv)); } catch { /* ignore */ }
}

function clampInt(v: unknown, min: number, max: number): number {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

// 依 RewardContext 調整稀有度權重，回傳調整後的 weight + 加成訊息
function adjustedWeights(ctx?: RewardContext): { weights: Record<Rarity, number>; bonuses: string[] } {
  const weights: Record<Rarity, number> = { ...RARITY_WEIGHT };
  const bonuses: string[] = [];
  if (!ctx) return { weights, bonuses };

  if (ctx.difficulty === 'hard') {
    weights.common -= 15;
    weights.rare += 7;
    weights.epic += 8;
    bonuses.push('困難難度加成');
  }
  if (ctx.itemsUsedInGame === 0) {
    weights.common -= 20;
    weights.rare += 15;
    weights.epic += 5;
    bonuses.push('未使用道具加成');
  }
  if (ctx.elapsedSec > 0 && ctx.elapsedSec < 180) {
    weights.epic += 5;
    weights.common -= 5;
    bonuses.push('快速通關加成');
  }
  // clamp
  for (const k of ['common', 'rare', 'epic'] as Rarity[]) {
    if (weights[k] < 0) weights[k] = 0;
  }
  return { weights, bonuses };
}

function pickRarityWeighted(weights: Record<Rarity, number>, rand: () => number): Rarity {
  const total = weights.common + weights.rare + weights.epic;
  if (total <= 0) return 'common';
  let roll = rand() * total;
  for (const r of ['common', 'rare', 'epic'] as Rarity[]) {
    roll -= weights[r];
    if (roll <= 0) return r;
  }
  return 'common';
}

function pickItemOfRarity(rarity: Rarity, rand: () => number): ItemKey {
  const list = ITEMS_BY_RARITY[rarity];
  const idx = Math.floor(rand() * list.length);
  return list[Math.min(idx, list.length - 1)];
}

// Combo 達標門檻：maxCombo >= COMBO_BONUS_THRESHOLD 時，有機率額外送 Hint / Undo
export const COMBO_BONUS_THRESHOLD = 5;
const COMBO_BONUS_PROB = 0.6; // 達標時 60% 機率送

// 為一個 itemKey 加入到 inventory（受 cap 限制），回傳新 inventory 與是否成功
function tryAddInventory(inv: ItemInventory, key: ItemKey): { inv: ItemInventory; granted: boolean; after: number } {
  const cap = INVENTORY_CAPS[key];
  const cur = inv[key];
  if (cur >= cap) return { inv, granted: false, after: cur };
  const next = { ...inv, [key]: cur + 1 };
  return { inv: next, granted: true, after: cur + 1 };
}

export function drawReward(
  inv: ItemInventory,
  rand: () => number,
  ctx?: RewardContext,
): { reward: RewardResult; nextInventory: ItemInventory } {
  const { weights, bonuses } = adjustedWeights(ctx);

  let rarity = pickRarityWeighted(weights, rand);

  // 每日挑戰保底 Rare 以上
  if (ctx?.isDailyChallenge && rarity === 'common') {
    rarity = 'rare';
    bonuses.push('每日挑戰保底');
  }

  const itemKey = pickItemOfRarity(rarity, rand);
  const add = tryAddInventory(inv, itemKey);
  let workingInv = add.inv;
  const granted = add.granted;

  // Combo 達標 → 額外 Hint 或 Undo
  let extra: ExtraReward | undefined;
  if (ctx && ctx.maxCombo >= COMBO_BONUS_THRESHOLD && rand() < COMBO_BONUS_PROB) {
    const extraKey: ItemKey = rand() < 0.5 ? 'hint' : 'undo';
    const eAdd = tryAddInventory(workingInv, extraKey);
    workingInv = eAdd.inv;
    extra = {
      itemKey: extraKey,
      granted: eAdd.granted,
      scoreBonus: eAdd.granted ? 0 : FULL_COMPENSATION.common,
    };
    bonuses.push(`連擊 x${ctx.maxCombo} 加成`);
  }

  if (!granted) {
    return {
      reward: {
        itemKey, rarity,
        granted: false,
        scoreBonus: FULL_COMPENSATION[rarity],
        inventoryAfter: inv[itemKey],
        bonuses,
        extra,
      },
      nextInventory: workingInv,
    };
  }

  return {
    reward: {
      itemKey, rarity,
      granted: true,
      scoreBonus: 0,
      inventoryAfter: add.after,
      bonuses,
      extra,
    },
    nextInventory: workingInv,
  };
}

export const ITEM_NAMES: Record<ItemKey, string> = {
  hint: '靈視提示',
  magicRemove: '炸彈',
  undo: '時光回溯',
  shuffle: '命運重排',
  reveal: '透視術',
  unseal: '解封術',
};

export const RARITY_NAMES: Record<Rarity, string> = {
  common: '普通',
  rare: '稀有',
  epic: '史詩',
};

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#9eb1d6',
  rare: '#5bc0d4',
  epic: '#d4a050',
};
