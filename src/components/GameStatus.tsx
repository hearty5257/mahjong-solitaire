import React from 'react';
import type { Difficulty, GameState } from '../game/types';
import { ROUND_MODIFIER_NAMES } from '../game/roundModifiers';

interface Props {
  state: GameState;
  elapsedSec: number;
  remaining: number;
  availablePairs: number;
  difficulty: Difficulty;
  seed: number;
  best: { score: number; timeSec: number } | null;
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
}

const GameStatus: React.FC<Props> = ({ state, elapsedSec, remaining, availablePairs, difficulty, seed, best }) => {
  return (
    <div className="status">
      <div className="status-row">
        <div className="status-cell"><span>分數</span><strong>{state.score}</strong></div>
        <div className="status-cell"><span>步數</span><strong>{state.moves}</strong></div>
        <div className="status-cell"><span>時間</span><strong>{formatTime(elapsedSec)}</strong></div>
        <div className="status-cell"><span>剩餘</span><strong>{remaining}</strong></div>
        <div className="status-cell"><span>可配對</span><strong>{availablePairs}</strong></div>
      </div>
      <div className="status-row status-row--small">
        <span>牌型：<b className="tag tag--gold">{state.layoutName}{state.mirror ? '（鏡像）' : ''}</b></span>
        <span>規則：<b className="tag tag--jade">{ROUND_MODIFIER_NAMES[state.roundModifier]}</b>
          {state.roundModifier === 'keyLock' ? ` (剩 ${state.keysRemaining} 對鑰匙)` : null}
        </span>
        <span>難度：<b className="tag tag--vermilion">{difficulty === 'easy' ? '簡單' : difficulty === 'normal' ? '普通' : '困難'}</b></span>
        <span>Seed：{seed}</span>
        {best ? <span>最佳：{best.score} / {formatTime(best.timeSec)}</span> : null}
      </div>
    </div>
  );
};

export default GameStatus;
