import type { BoardState, Tile, TileType } from './types';
import { TILE_W, TILE_H } from './layout';

// ----- 幾何輔助 -----
function rectsOverlap(
  ax: number, ay: number,
  bx: number, by: number,
): boolean {
  return (
    ax < bx + TILE_W &&
    ax + TILE_W > bx &&
    ay < by + TILE_H &&
    ay + TILE_H > by
  );
}

// 兩塊牌的 Y 範圍是否重疊
function yOverlap(a: Tile, b: Tile): boolean {
  return a.y < b.y + TILE_H && a.y + TILE_H > b.y;
}

// ----- 可移動判定 -----
export function isCoveredAbove(tile: Tile, board: BoardState): boolean {
  for (const t of board) {
    if (t.removed) continue;
    if (t.id === tile.id) continue;
    if (t.z <= tile.z) continue;
    if (rectsOverlap(tile.x, tile.y, t.x, t.y)) return true;
  }
  return false;
}

export function isLeftBlocked(tile: Tile, board: BoardState): boolean {
  for (const t of board) {
    if (t.removed) continue;
    if (t.id === tile.id) continue;
    if (t.z !== tile.z) continue;
    if (!yOverlap(tile, t)) continue;
    // B 在左：B.x < A.x，且 B 的右緣 (B.x + TILE_W) 已碰到或超過 A.x
    if (t.x < tile.x && t.x + TILE_W >= tile.x) return true;
  }
  return false;
}

export function isRightBlocked(tile: Tile, board: BoardState): boolean {
  for (const t of board) {
    if (t.removed) continue;
    if (t.id === tile.id) continue;
    if (t.z !== tile.z) continue;
    if (!yOverlap(tile, t)) continue;
    if (t.x > tile.x && t.x <= tile.x + TILE_W) return true;
  }
  return false;
}

// 可移動：上方無覆蓋 + 至少左或右一邊開放
export function isTileFree(tile: Tile, board: BoardState): boolean {
  if (tile.removed) return false;
  if (isCoveredAbove(tile, board)) return false;
  const left = isLeftBlocked(tile, board);
  const right = isRightBlocked(tile, board);
  return !(left && right);
}

// ----- 配對判定 -----
// frozen / locked 牌不可配對（fog 與 key 可以正常配對）
export function isMatchable(t: Tile): boolean {
  if (t.removed) return false;
  if (t.modifier === 'frozen') return false;
  if (t.modifier === 'locked') return false;
  return true;
}

export function canMatch(a: Tile, b: Tile): boolean {
  if (a.id === b.id) return false;
  if (!isMatchable(a) || !isMatchable(b)) return false;
  return a.tileType === b.tileType;
}

// 取得所有「目前可立即進行」的合法配對 (回傳 [idA, idB] 配對列表)
// 為了效能，相同 tileType 的可移動牌只會列出兩兩配對
// 注意：frozen / locked 牌會被過濾掉
export function getAvailableMatches(board: BoardState): Array<[number, number]> {
  const freeByType = new Map<TileType, Tile[]>();
  for (const t of board) {
    if (t.removed) continue;
    if (!isMatchable(t)) continue;
    if (!isTileFree(t, board)) continue;
    const list = freeByType.get(t.tileType) ?? [];
    list.push(t);
    freeByType.set(t.tileType, list);
  }
  const pairs: Array<[number, number]> = [];
  for (const list of freeByType.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        pairs.push([list[i].id, list[j].id]);
      }
    }
  }
  return pairs;
}

// 嘗試把指定的兩個 id 配對消除；成功返回新棋盤 (immutably)，失敗回 null
export function removePair(tileAId: number, tileBId: number, board: BoardState): BoardState | null {
  if (tileAId === tileBId) return null;
  const a = board.find((t) => t.id === tileAId);
  const b = board.find((t) => t.id === tileBId);
  if (!a || !b) return null;
  if (!canMatch(a, b)) return null;
  if (!isTileFree(a, board)) return null;
  if (!isTileFree(b, board)) return null;
  return board.map((t) => (t.id === tileAId || t.id === tileBId ? { ...t, removed: true } : t));
}

// ----- 勝負判定 -----
export function isWin(board: BoardState): boolean {
  return board.every((t) => t.removed);
}

export function remainingCount(board: BoardState): number {
  let count = 0;
  for (const t of board) if (!t.removed) count++;
  return count;
}

// 卡關：沒有任何可配對
export function isStuck(board: BoardState): boolean {
  if (isWin(board)) return false;
  return getAvailableMatches(board).length === 0;
}
