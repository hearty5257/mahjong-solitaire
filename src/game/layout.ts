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
// 1) 經典龜形（原本 136 張）
// ------------------------------------------------------------------
function buildTurtle(): LayoutSlot[] {
  const slots: LayoutSlot[] = [];
  const layer0: Array<{ y: number; xs: number[] }> = [
    { y: 0, xs: range(2, 26, 2) },
    { y: 2, xs: range(4, 24, 2) },
    { y: 4, xs: range(2, 28, 2) },
    { y: 6, xs: range(2, 28, 2) },
    { y: 8, xs: range(2, 28, 2) },
    { y: 10, xs: range(2, 28, 2) },
    { y: 12, xs: range(4, 24, 2) },
    { y: 14, xs: range(2, 26, 2) },
  ];
  const layer1: Array<{ y: number; xs: number[] }> = [
    { y: 4, xs: range(8, 20, 2) },
    { y: 6, xs: range(8, 20, 2) },
    { y: 8, xs: range(8, 20, 2) },
    { y: 10, xs: range(8, 20, 2) },
  ];
  const layer2 = [
    { y: 6, xs: range(10, 18, 2) },
    { y: 8, xs: range(10, 18, 2) },
  ];
  const layer3 = [
    { y: 6, xs: range(12, 16, 2) },
    { y: 8, xs: range(12, 16, 2) },
  ];
  const layer4 = [{ y: 7, xs: [13] }];
  pushRows(slots, 0, layer0);
  pushRows(slots, 1, layer1);
  pushRows(slots, 2, layer2);
  pushRows(slots, 3, layer3);
  pushRows(slots, 4, layer4);
  slots.push({ x: -2, y: 7, z: 0 });
  slots.push({ x: 0, y: 7, z: 0 });
  slots.push({ x: 26, y: 7, z: 0 });
  return slots; // 136
}

// ------------------------------------------------------------------
// 2) 金字塔形 Pyramid（120）
// 每層向中心縮 2 半格，4 層
// ------------------------------------------------------------------
function buildPyramid(): LayoutSlot[] {
  const slots: LayoutSlot[] = [];
  // z=0: 8x8, z=1: 6x6, z=2: 4x4, z=3: 2x2
  for (let z = 0; z < 4; z++) {
    const size = 8 - z * 2;
    const off = z * 2;
    pushGrid(slots, z, off, off, size, size);
  }
  return slots; // 64+36+16+4 = 120
}

// ------------------------------------------------------------------
// 3) 雙塔形 Twin Towers（120）
// 左右兩座 4 層塔 + 中央連接橋
// ------------------------------------------------------------------
function buildTwinTowers(): LayoutSlot[] {
  const slots: LayoutSlot[] = [];
  const tower = (baseX: number) => {
    // z=0: 4 cols × 8 rows = 32, x: baseX..baseX+6, y: 0..14
    pushGrid(slots, 0, baseX, 0, 4, 8);
    // z=1: 2 cols × 6 rows = 12, centered
    pushGrid(slots, 1, baseX + 2, 2, 2, 6);
    // z=2: 2x4 = 8
    pushGrid(slots, 2, baseX + 2, 4, 2, 4);
    // z=3: 2x2 = 4
    pushGrid(slots, 3, baseX + 2, 6, 2, 2);
  };
  tower(0);     // 56
  tower(16);    // 56
  // 中央連接橋 z=0: 4 cols × 2 rows = 8 (在兩塔中間 y=6,8)
  pushGrid(slots, 0, 8, 6, 4, 2);
  return slots; // 56 + 56 + 8 = 120
}

// ------------------------------------------------------------------
// 4) 橋樑形 Bridge（114）
// 左右兩塊平地，中間升起一座拱橋
// ------------------------------------------------------------------
function buildBridge(): LayoutSlot[] {
  const slots: LayoutSlot[] = [];
  // 左場 z=0: 6 cols × 8 rows = 48 (x: 0..10)
  pushGrid(slots, 0, 0, 0, 6, 8);
  // 右場 z=0: 6 cols × 8 rows = 48 (x: 18..28)
  pushGrid(slots, 0, 18, 0, 6, 8);
  // 拱橋 z=1: 3 cols × 4 rows = 12 (x: 12..16, y: 4..10)
  pushGrid(slots, 1, 12, 4, 3, 4);
  // 拱橋頂 z=2: 3 cols × 2 rows = 6 (x: 12..16, y: 6..8)
  pushGrid(slots, 2, 12, 6, 3, 2);
  return slots; // 48+48+12+6 = 114
}

// ------------------------------------------------------------------
// 5) 螺旋形 Spiral（100）
// 同心環狀，向內每環 z+1，視覺呈現「向上盤旋」
// ------------------------------------------------------------------
function buildSpiral(): LayoutSlot[] {
  const slots: LayoutSlot[] = [];
  // 環 z=0: 10x10 外框 - 8x8 內框 = 36
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      if (i === 0 || i === 9 || j === 0 || j === 9) {
        slots.push({ x: i * 2, y: j * 2, z: 0 });
      }
    }
  }
  // 環 z=1: 8x8 - 6x6 = 28 (偏移 +2, +2)
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if (i === 0 || i === 7 || j === 0 || j === 7) {
        slots.push({ x: 2 + i * 2, y: 2 + j * 2, z: 1 });
      }
    }
  }
  // 環 z=2: 6x6 - 4x4 = 20 (偏移 +4, +4)
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      if (i === 0 || i === 5 || j === 0 || j === 5) {
        slots.push({ x: 4 + i * 2, y: 4 + j * 2, z: 2 });
      }
    }
  }
  // 中央 z=3: 4x4 = 16 (偏移 +6, +6)
  pushGrid(slots, 3, 6, 6, 4, 4);
  return slots; // 36+28+20+16 = 100
}

// ------------------------------------------------------------------
// Registry
// ------------------------------------------------------------------
export const LAYOUTS: Record<LayoutKey, LayoutDef> = {
  turtle:     { key: 'turtle',     name: '經典龜形', desc: '中央高、四周低，適合新手與標準模式',     build: buildTurtle },
  pyramid:    { key: 'pyramid',    name: '金字塔',   desc: '中央最高，需逐層拆解中心',               build: buildPyramid },
  twinTowers: { key: 'twinTowers', name: '雙塔',     desc: '左右兩座牌塔，中間少量連接牌',           build: buildTwinTowers },
  bridge:     { key: 'bridge',     name: '橋樑',     desc: '左右兩區由中間拱橋連接',                 build: buildBridge },
  spiral:     { key: 'spiral',     name: '螺旋',     desc: '同心環狀向中心盤旋，順序影響開放路徑',   build: buildSpiral },
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
  if (opts?.mirror) slots = mirrorX(slots);
  return slots;
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
