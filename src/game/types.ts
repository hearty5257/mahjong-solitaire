export type TileSuit = 'dot' | 'bam' | 'crak' | 'wind' | 'dragon';
export type TileType = string;

// 牌的特殊狀態（每張牌最多一種）
// fog: 牌面被迷霧遮住，需被翻開或變成可移動才會顯示
// frozen: 被冰封，無法配對；每消除若干組後自動解凍 1 張
// locked: 鎖鏈，需要先消除所有 key 配對才能解鎖
// key: 鑰匙牌，消除其配對後減少剩餘鑰匙數
export type TileModifier = 'fog' | 'frozen' | 'locked' | 'key';

export interface Tile {
  id: number;
  tileType: TileType;
  x: number;
  y: number;
  z: number;
  removed: boolean;
  modifier?: TileModifier;
  revealed?: boolean;  // fog 牌專用：已顯示真實牌面
}

export type BoardState = Tile[];
export type GameStatus = 'playing' | 'won' | 'stuck';
export type Difficulty = 'easy' | 'normal' | 'hard';

// 本局特殊規則
export type RoundModifier = 'none' | 'fog' | 'frozen' | 'keyLock';

// ------------------- Magic Items -------------------
export type ItemKey = 'hint' | 'magicRemove' | 'undo' | 'shuffle' | 'reveal' | 'unseal';

export interface MagicItemState {
  hint: number;
  magicRemove: number;
  undo: number;
  shuffle: number;
  reveal: number;
  unseal: number;
}

export interface ItemInventory {
  hint: number;
  magicRemove: number;
  undo: number;
  shuffle: number;
  reveal: number;
  unseal: number;
}

export type Rarity = 'common' | 'rare' | 'epic';

// v0.4: 通關表現加成
export interface RewardContext {
  difficulty: Difficulty;
  itemsUsedInGame: number;
  maxCombo: number;
  elapsedSec: number;
  isDailyChallenge: boolean;
}

export interface ExtraReward {
  itemKey: ItemKey;
  granted: boolean;
  scoreBonus: number;
}

export interface RewardResult {
  itemKey: ItemKey;
  rarity: Rarity;
  granted: boolean;
  scoreBonus: number;
  inventoryAfter: number;
  bonuses: string[];          // 哪些加成生效 (顯示用)
  extra?: ExtraReward;        // Combo 達標額外贈送（Hint 或 Undo）
}

// ------------------- Move History -------------------
// v0.3：採用 board snapshot，可正確還原 modifier 狀態
export interface RoundStateSnapshot {
  pairsSinceUnfreeze: number;
  keysRemaining: number;
}

export interface MoveHistoryEntry {
  boardSnapshot: BoardState;
  prevScore: number;
  prevCombo: number;
  prevComboTime: number;
  prevItems: MagicItemState;
  prevInventory: ItemInventory;
  prevRound: RoundStateSnapshot;
}

// ------------------- Game State -------------------
export interface GameState {
  board: BoardState;
  selectedId: number | null;
  hintIds: number[] | null;
  score: number;
  moves: number;
  startTimeMs: number;
  endTimeMs: number | null;
  status: GameStatus;
  items: MagicItemState;
  inventory: ItemInventory;
  history: MoveHistoryEntry[];
  combo: number;
  lastClearMs: number;
  difficulty: Difficulty;
  seed: number;
  message: string | null;
  layoutKey: string;
  layoutName: string;
  mirror: boolean;
  itemsUsedInGame: number;
  lastReward: RewardResult | null;
  // v0.3: 特殊規則
  roundModifier: RoundModifier;
  pairsSinceUnfreeze: number;   // 冰封：每消除 N 組解凍 1 張
  keysRemaining: number;        // 鑰匙鎖鏈：尚需消除幾組鑰匙才能解鎖
  // v0.4: 表現追蹤 & 每日挑戰
  maxCombo: number;
  isDailyChallenge: boolean;
}

export interface LayoutSlot {
  x: number;
  y: number;
  z: number;
}
