import React from 'react';
import type { Difficulty } from '../game/types';

interface Props {
  difficulty: Difficulty;
  isDailyChallenge: boolean;
  dailyDoneToday: boolean;
  onChangeDifficulty: (d: Difficulty) => void;
  onNewGame: () => void;
  onRestart: () => void;
  onDailyChallenge: () => void;
}

const Toolbar: React.FC<Props> = ({
  difficulty, isDailyChallenge, dailyDoneToday,
  onChangeDifficulty, onNewGame, onRestart, onDailyChallenge,
}) => {
  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <label>難度：</label>
        <select
          value={difficulty}
          onChange={(e) => onChangeDifficulty(e.target.value as Difficulty)}
          disabled={isDailyChallenge}
          aria-label="難度選擇"
          title={isDailyChallenge ? '每日挑戰固定為困難難度' : ''}
        >
          <option value="easy">簡單</option>
          <option value="normal">普通</option>
          <option value="hard">困難</option>
        </select>
      </div>
      <div className="toolbar-group">
        <button className="btn btn--primary" onClick={onNewGame}>新局</button>
        <button className="btn" onClick={onRestart}>重新開始</button>
        <button
          className={`btn btn--daily ${isDailyChallenge ? 'btn--daily-active' : ''}`}
          onClick={onDailyChallenge}
          title={dailyDoneToday ? '今日已通關每日挑戰；可再玩但不再保底' : '每日固定牌局，保底贈送 Rare 以上道具'}
        >
          每日挑戰 {dailyDoneToday ? '✓' : '🗓'}
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
