import type { Difficulty, LayoutSlot } from './types';

// 半格座標：每張牌寬高為 2 個半格
export const TILE_W = 2;
export const TILE_H = 2;

export type LayoutKey = 'turtle' | 'pyramid' | 'twinTowers' | 'bridge' | 'spiral';

export interface LayoutDef {
  key: LayoutKey;
  name: string;     // 顯示名稱
  desc: string;
  build: () => LayoutSlot[];
}

// ------------------------------------------------------------------
// 工具
// ------------------------------------------------------------------
function range(start: number, endExclusive: number, step: number): number[] {
  const arr: number[] = [];
  for (let v = start; v < endExclusive; v += step) arr.push(v);
  return arr;
}

function pushRows(slots: LayoutSlot[], z: number, rows: Array<{ y: number; xs: number[] }>) {
  for (const r of rows) for (const x of r.xs) slots.push({ x, y: r.y, z });
}

function pushGrid(slots: LayoutSlot[], z: number, x0: number, y0: number, cols: number, rows: number) {
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      slots.push({ x: x0 + i * 2, y: y0 + j * 2, z });
    }
  }
}

// ------------------------------------------------------------------
// 牌局生成硬性限制：
//   寬度 ≤ MAX_TILES_WIDE 張牌（16 半格）
//   高度 ≤ MAX_TILES_TALL 張牌（20 半格）
// 這樣手機畫面比例較佳（直向更高、橫向不會被牌盤撐爆）
// ------------------------------------------------------------------
export const MAX_TILES_WIDE = 8;
export const MAX_TILES_TALL = 10;

// 計算一份 layout 的「寬高張數」
function measureLayout(slots: LayoutSlot[]): { wide: number; tall: number } {
  if (slots.length === 0) return { wide: 0, tall: 0 };
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const s of slots) {
    if (s.x < minX) minX = s.x;
    if (s.x > maxX) maxX = s.x;
    if (s.y < minY) minY = s.y;
    if (s.y > maxY) maxY = s.y;
  }
  // 每張牌寬 / 高 = 2 半格；起點 x 與終點 x+2 都要算入
  return {
    wide: (maxX - minX + 2) / 2,
    tall: (maxY - minY + 2) / 2,
  };
}

// 違反限制時拋錯（開發階段抓 bug；prod 也會 throw，相當於硬性保證）
function assertWithinBounds(key: string, slots: LayoutSlot[]) {
  const { wide, tall } = measureLayout(slots);
  if (wide > MAX_TILES_WIDE) {
    throw new Error(`Layout "${key}" 寬度 ${wide} 張超過上限 ${MAX_TILES_WIDE}`);
  }
  if (tall > MAX_TILES_TALL) {
    throw new Error(`Layout "${key}" 高度 ${tall} 張超過上限 ${MAX_TILES_TALL}`);
  }
}

// 1) 經典龜形：8x10 底 + 6x6 + 4x4 + 2x2 = 136
function buildTurtle(): LayoutSlot[] {
  const slots: LayoutSlot[] = [];
  pushGrid(slots, 0, 0, 0, 8, 10);    // 80
  pushGrid(slots, 1, 2, 2, 6, 6);     // 36
  pushGrid(slots, 2, 4, 4, 4, 4);     // 16
  pushGrid(slots, 3, 6, 6, 2, 2);     // 4
  return slots; // 136
}

// 2) 金字塔：8x8 + 6x6 + 4x4 + 2x2 = 120（完美對稱）
function buildPyramid(): LayoutSlot[] {
  const slots: LayoutSlot[] = [];
  for (let z = 0; z < 4; z++) {
    const size = 8 - z * 2;
    const off = z * 2;
    pushGrid(slots, z, off, off, size, size);
  }
  return slots; // 64+36+16+4 = 120
}

// 3) 雙塔：上下兩座塔疊放（垂直雙塔，寬 8 高 9）
//    上塔 + 中央連橋 + 下塔，所有 z 對齊
function buildTwinTowers(): LayoutSlot[] {
  const slots: LayoutSlot[] = [];
  // 上塔（y=0..6，4 rows）
  pushGrid(slots, 0, 0, 0, 8, 4);     // z=0: 8x4 = 32
  pushGrid(slots, 1, 2, 0, 4, 4);     // z=1: 4x4 = 16 (對齊 z=0)
  pushGrid(slots, 2, 4, 2, 2, 2);     // z=2: 2x2 = 4
  // 中央連橋（y=8，1 row）
  pushGrid(slots, 0, 0, 8, 8, 1);     // z=0: 8x1 = 8
  // 下塔（y=10..16，4 rows）
  pushGrid(slots, 0, 0, 10, 8, 4);    // z=0: 8x4 = 32
  pushGrid(slots, 1, 2, 10, 4, 4);    // z=1: 4x4 = 16 (對齊 z=0)
  pushGrid(slots, 2, 4, 12, 2, 2);    // z=2: 2x2 = 4
  return slots; // 32+16+4+8+32+16+4 = 112，寬 8 高 9
}

// 4) 橋樑：左右兩塊平地（各 3 寬）+ 中央拱橋
function buildBridge(): LayoutSlot[] {
  const slots: LayoutSlot[] = [];
  // 左場 z=0: 3 cols × 10 rows = 30
  pushGrid(slots, 0, 0, 0, 3, 10);
  // 右場 z=0: 3 cols × 10 rows = 30 (x=10..14)
  pushGrid(slots, 0, 10, 0, 3, 10);
  // 中央底 z=0: 2 cols × 4 rows = 8 (y=6,8,10,12)
  pushGrid(slots, 0, 6, 6, 2, 4);
  // 拱橋 z=1: 4 cols × 4 rows = 16 (x=4..10, y=6..12)
  pushGrid(slots, 1, 4, 6, 4, 4);
  // 拱橋頂 z=2: 2 cols × 2 rows = 4 (中央)
  pushGrid(slots, 2, 6, 8, 2, 2);
  return slots; // 30+30+8+16+4 = 88
}

// 5) 螺旋：8 寬同心環，向內每環 z+1（最寬 8 張）
function buildSpiral(): LayoutSlot[] {
  const slots: LayoutSlot[] = [];
  // 外環 z=0: 8x10 外框 - 6x8 內 = 80-48 = 32
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 10; j++) {
      if (i === 0 || i === 7 || j === 0 || j === 9) {
        slots.push({ x: i * 2, y: j * 2, z: 0 });
      }
    }
  }
  // 中環 z=1: 6x8 外框 - 4x6 內 = 48-24 = 24
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 8; j++) {
      if (i === 0 || i === 5 || j === 0 || j === 7) {
        slots.push({ x: 2 + i * 2, y: 2 + j * 2, z: 1 });
      }
    }
  }
  // 內環 z=2: 4x6 外框 - 2x4 內 = 24-8 = 16
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 6; j++) {
      if (i === 0 || i === 3 || j === 0 || j === 5) {
        slots.push({ x: 4 + i * 2, y: 4 + j * 2, z: 2 });
      }
    }
  }
  // 中央 z=3: 2x4 = 8
  pushGrid(slots, 3, 6, 6, 2, 4);
  return slots; // 32+24+16+8 = 80
}

// ------------------------------------------------------------------
// Registry
// ------------------------------------------------------------------
export const LAYOUTS: Record<LayoutKey, LayoutDef> = {
  turtle:     { key: 'turtle',     name: '經典龜形', desc: '8 寬 × 10 高 四層階梯，適合熟悉規則',     build: buildTurtle },
  pyramid:    { key: 'pyramid',    name: '金字塔',   desc: '對稱四層方塔，逐層拆解中心',               build: buildPyramid },
  twinTowers: { key: 'twinTowers', name: '雙塔',     desc: '上下兩座塔疊放，中間僅一列連接',           build: buildTwinTowers },
  bridge:     { key: 'bridge',     name: '橋樑',     desc: '左右兩塊平地，中間拱橋連接',               build: buildBridge },
  spiral:     { key: 'spiral',     name: '螺旋',     desc: '同心環狀向中心盤旋，順序影響開放路徑',     build: buildSpiral },
};

export const LAYOUT_KEYS: LayoutKey[] = ['turtle', 'pyramid', 'twinTowers', 'bridge', 'spiral'];

// 向後相容（已有測試與舊程式可能使用）
export function getTurtleLayout(): LayoutSlot[] {
  return buildTurtle().map((s) => ({ ...s }));
}

// 鏡像（沿 x 軸）：x' = (maxX) - x
function mirrorX(slots: LayoutSlot[]): LayoutSlot[] {
  if (slots.length === 0) return slots;
  let maxX = slots[0].x;
  for (const s of slots) if (s.x > maxX) maxX = s.x;
  return slots.map((s) => ({ ...s, x: maxX - s.x }));
}

export function getLayoutByKey(key: LayoutKey, opts?: { mirror?: boolean }): LayoutSlot[] {
  const def = LAYOUTS[key];
  let slots = def.build().map((s) => ({ ...s }));
  // 硬性限制：寬 ≤ MAX_TILES_WIDE、高 ≤ MAX_TILES_TALL
  assertWithinBounds(key, slots);
  if (opts?.mirror) slots = mirrorX(slots);
  return slots;
}

// 公開的尺寸查詢（供測試 / debug 使用）
export function getLayoutSize(key: LayoutKey): { wide: number; tall: number } {
  return measureLayout(LAYOUTS[key].build());
}

// 根據 seed + 難度選一個 layout
// easy：只用經典龜形
// normal：龜形 / 金字塔 / 雙塔
// hard：5 種全開（含橋樑、螺旋）
export function pickLayoutKey(seed: number, difficulty: Difficulty = 'hard'): LayoutKey {
  let pool: LayoutKey[];
  switch (difficulty) {
    case 'easy':
      pool = ['turtle'];
      break;
    case 'normal':
      pool = ['turtle', 'pyramid', 'twinTowers'];
      break;
    case 'hard':
    default:
      pool = LAYOUT_KEYS;
      break;
  }
  const idx = Math.abs(Math.floor(seed)) % pool.length;
  return pool[idx];
}
