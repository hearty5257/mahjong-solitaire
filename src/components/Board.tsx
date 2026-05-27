import React, { useEffect, useMemo, useState } from 'react';
import type { BoardState } from '../game/types';
import { isTileFree } from '../game/rules';
import TileComponent from './Tile';

interface Props {
  board: BoardState;
  selectedId: number | null;
  hintIds: number[] | null;
  onTileClick: (id: number) => void;
}

const Z_OFFSET = 4;

// 計算「每半格像素」，讓牌盤 width 不超過視窗寬，height ≈ 50% 視窗高
function computePxPerHalf(
  viewportW: number,
  viewportH: number,
  boundsW: number,   // (maxX - minX) 半格
  boundsH: number,   // (maxY - minY) 半格
  maxZ: number,
): number {
  const availW = Math.min(viewportW - 32, 1100);
  const availH = Math.max(220, viewportH * 0.55);

  // widthPx  = (boundsW + 4) * px + maxZ * Z_OFFSET
  // heightPx = (boundsH + 4) * px + maxZ * Z_OFFSET
  const pxFromW = (availW - maxZ * Z_OFFSET) / (boundsW + 4);
  const pxFromH = (availH - maxZ * Z_OFFSET) / (boundsH + 4);

  let px = Math.min(pxFromW, pxFromH);
  if (!isFinite(px)) px = 18;
  px = Math.floor(px);
  // 範圍：手機最小 8、桌機最大 24
  if (px < 8) px = 8;
  if (px > 24) px = 24;
  return px;
}

const Board: React.FC<Props> = ({ board, selectedId, hintIds, onTileClick }) => {
  // 計算 bounds（先計算才能得知所需 pxPerHalf）
  const bounds = useMemo(() => {
    let minX = 0, maxX = 0, minY = 0, maxY = 0, maxZ = 0;
    for (const t of board) {
      if (t.x < minX) minX = t.x;
      if (t.x > maxX) maxX = t.x;
      if (t.y < minY) minY = t.y;
      if (t.y > maxY) maxY = t.y;
      if (t.z > maxZ) maxZ = t.z;
    }
    return { minX, maxX, minY, maxY, maxZ };
  }, [board]);

  const boundsW = bounds.maxX - bounds.minX;
  const boundsH = bounds.maxY - bounds.minY;

  const [vp, setVp] = useState<{ w: number; h: number }>(() =>
    typeof window === 'undefined'
      ? { w: 1024, h: 768 }
      : { w: window.innerWidth, h: window.innerHeight },
  );

  useEffect(() => {
    const update = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  const pxPerHalf = useMemo(
    () => computePxPerHalf(vp.w, vp.h, boundsW, boundsH, bounds.maxZ),
    [vp.w, vp.h, boundsW, boundsH, bounds.maxZ],
  );

  const freeMap = useMemo(() => {
    const m = new Map<number, boolean>();
    for (const t of board) m.set(t.id, !t.removed && isTileFree(t, board));
    return m;
  }, [board]);

  const offsetX = -bounds.minX + 1;
  const offsetY = -bounds.minY + 1;
  const widthPx = ((bounds.maxX - bounds.minX) + 2 + 2) * pxPerHalf + bounds.maxZ * Z_OFFSET;
  const heightPx = ((bounds.maxY - bounds.minY) + 2 + 2) * pxPerHalf + bounds.maxZ * Z_OFFSET;

  const shifted = useMemo(
    () => board.map((t) => ({ ...t, x: t.x + offsetX, y: t.y + offsetY })),
    [board, offsetX, offsetY],
  );

  return (
    <div
      className="board"
      style={{ width: `${widthPx}px`, height: `${heightPx}px` }}
    >
      {shifted.map((t) => (
        <TileComponent
          key={t.id}
          tile={t}
          free={freeMap.get(t.id) ?? false}
          selected={selectedId === t.id}
          hint={hintIds ? hintIds.includes(t.id) : false}
          onClick={onTileClick}
          pixelPerHalf={pxPerHalf}
        />
      ))}
    </div>
  );
};

export default Board;
