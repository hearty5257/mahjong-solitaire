import React from 'react';

export type CurtainPhase = 'idle' | 'closing' | 'opening';

interface Props {
  phase: CurtainPhase;
  /** true：覆蓋整個 viewport（landing ↔ game 切換用） */
  fullscreen?: boolean;
}

const Curtain: React.FC<Props> = ({ phase, fullscreen }) => {
  if (phase === 'idle') return null;
  const cls =
    `curtain-overlay curtain-overlay--${phase}` +
    (fullscreen ? ' curtain-overlay--fullscreen' : '');
  return (
    <div className={cls} aria-hidden>
      <div className="curtain curtain--left">
        <div className="curtain-pelmet" />
        <div className="curtain-tassel">
          <div className="curtain-tassel-knot" />
          <div className="curtain-tassel-strings" />
        </div>
        <div className="curtain-fringe" />
      </div>
      <div className="curtain curtain--right">
        <div className="curtain-pelmet" />
        <div className="curtain-tassel">
          <div className="curtain-tassel-knot" />
          <div className="curtain-tassel-strings" />
        </div>
        <div className="curtain-fringe" />
      </div>
      <div className="curtain-seam" />
    </div>
  );
};

export default Curtain;
