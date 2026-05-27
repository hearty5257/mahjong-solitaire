import React from 'react';

export type CurtainPhase = 'idle' | 'closing' | 'opening';

interface Props { phase: CurtainPhase }

// 中國風紅金窗簾轉場
// closing：左右兩片紅絨幕從外側往中央拉攏
// opening：再拉開回外側
const Curtain: React.FC<Props> = ({ phase }) => {
  if (phase === 'idle') return null;
  return (
    <div className={`curtain-overlay curtain-overlay--${phase}`} aria-hidden>
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
      {/* 中縫金線（兩幕合攏時顯示） */}
      <div className="curtain-seam" />
    </div>
  );
};

export default Curtain;
