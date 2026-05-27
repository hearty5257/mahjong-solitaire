import React from 'react';
import type { Tile as TileT } from '../game/types';
import TileFace from './TileFace';

interface Props {
  tile: TileT;
  free: boolean;
  selected: boolean;
  hint: boolean;
  onClick: (id: number) => void;
  pixelPerHalf: number;
}

const TILE_HALF_W = 2;
const TILE_HALF_H = 2;
const Z_OFFSET = 4;

const TileComponent: React.FC<Props> = ({ tile, free, selected, hint, onClick, pixelPerHalf }) => {
  if (tile.removed) return null;

  const px = tile.x * pixelPerHalf - tile.z * Z_OFFSET;
  const py = tile.y * pixelPerHalf - tile.z * Z_OFFSET;
  const w = TILE_HALF_W * pixelPerHalf;
  const h = TILE_HALF_H * pixelPerHalf;
  const zIndex = tile.z * 100 + tile.y + 1000;

  // 視覺：fog 牌未被 reveal 也未變成 free 時顯示牌背
  const isFog = tile.modifier === 'fog';
  const fogHidden = isFog && !tile.revealed && !free;

  const classes = ['tile'];
  if (free) classes.push('tile--free'); else classes.push('tile--blocked');
  if (selected) classes.push('tile--selected');
  if (hint) classes.push('tile--hint');
  if (tile.modifier === 'frozen') classes.push('tile--frozen');
  if (tile.modifier === 'locked') classes.push('tile--locked');
  if (tile.modifier === 'key') classes.push('tile--key');
  if (fogHidden) classes.push('tile--fog');

  return (
    <div
      className={classes.join(' ')}
      style={{
        left: `${px}px`,
        top: `${py}px`,
        width: `${w}px`,
        height: `${h}px`,
        zIndex,
      }}
      onClick={() => onClick(tile.id)}
      role="button"
      aria-label={`牌 ${tile.tileType}${tile.modifier ? ' ' + tile.modifier : ''}`}
    >
      <div className="tile-face">
        {fogHidden ? (
          <div className="tile-back">？</div>
        ) : (
          <TileFace tileType={tile.tileType} />
        )}
      </div>

      {/* modifier 覆蓋層 */}
      {tile.modifier === 'frozen' ? <div className="tile-overlay tile-overlay--frozen">❄</div> : null}
      {tile.modifier === 'locked' ? <div className="tile-overlay tile-overlay--locked">🔒</div> : null}
      {tile.modifier === 'key' ? <div className="tile-overlay tile-overlay--key">🗝</div> : null}
    </div>
  );
};

export default React.memo(TileComponent);
