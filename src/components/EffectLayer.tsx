import React, { useEffect } from 'react';

export type EffectKey = 'hint' | 'reveal' | 'unseal' | 'magicRemove' | 'undo' | 'shuffle';

interface Props {
  effect: EffectKey | null;
  onDone: () => void;
}

// 各特效自動結束時間（ms）
const DURATION: Record<EffectKey, number> = {
  hint: 700,
  reveal: 1200,
  unseal: 800,
  magicRemove: 900,
  undo: 900,
  shuffle: 1100,
};

// 每個 effect 對應的圖示與輔助粒子
const ICON: Record<EffectKey, string> = {
  hint: '👁',
  reveal: '🌫',
  unseal: '🗝',
  magicRemove: '💥',   // 炸彈引爆 (按鈕用 💣，特效用 💥)
  undo: '⏪',
  shuffle: '🔀',
};

const EffectLayer: React.FC<Props> = ({ effect, onDone }) => {
  useEffect(() => {
    if (!effect) return;
    const t = window.setTimeout(onDone, DURATION[effect]);
    return () => window.clearTimeout(t);
  }, [effect, onDone]);

  if (!effect) return null;

  return (
    <div className={`fx fx--${effect}`} aria-hidden>
      {/* 主圖示 */}
      <div className="fx-icon">{ICON[effect]}</div>
      {/* 額外粒子（依特效需要） */}
      {effect === 'magicRemove' ? (
        <>
          {/* 炸彈衝擊波 + 火花 */}
          <div className="fx-sparkle fx-sparkle--1">🔥</div>
          <div className="fx-sparkle fx-sparkle--2">💥</div>
          <div className="fx-sparkle fx-sparkle--3">🔥</div>
          <div className="fx-sparkle fx-sparkle--4">💥</div>
        </>
      ) : null}
      {effect === 'reveal' ? <div className="fx-veil" /> : null}
      {effect === 'hint' ? <div className="fx-ring" /> : null}
      {effect === 'undo' ? <div className="fx-trail" /> : null}
      {effect === 'shuffle' ? (
        <>
          <div className="fx-swirl fx-swirl--a">🀄</div>
          <div className="fx-swirl fx-swirl--b">🀅</div>
          <div className="fx-swirl fx-swirl--c">🀆</div>
        </>
      ) : null}
      {effect === 'unseal' ? (
        <>
          <div className="fx-chain fx-chain--1">⛓</div>
          <div className="fx-chain fx-chain--2">⛓</div>
        </>
      ) : null}
    </div>
  );
};

export default EffectLayer;
