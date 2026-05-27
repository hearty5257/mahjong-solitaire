import React, { useCallback, useRef, useState } from 'react';
import { useGame } from './hooks/useGame';
import Board from './components/Board';
import GameStatus from './components/GameStatus';
import MagicItems from './components/MagicItems';
import Toolbar from './components/Toolbar';
import Curtain, { CurtainPhase } from './components/Curtain';
import { ITEM_NAMES, RARITY_COLORS, RARITY_NAMES } from './game/inventory';

const CURTAIN_CLOSE_MS = 600;  // 拉攏時長
const CURTAIN_HOLD_MS = 120;   // 拉攏完成後停留
const CURTAIN_OPEN_MS = 600;   // 拉開時長

const App: React.FC = () => {
  const game = useGame();
  const { state } = game;

  const [curtainPhase, setCurtainPhase] = useState<CurtainPhase>('idle');
  const curtainBusy = useRef(false);

  // 包一層：先 closing → 中央時執行 action → opening → idle
  const withCurtain = useCallback((action: () => void) => {
    if (curtainBusy.current) return;
    curtainBusy.current = true;
    setCurtainPhase('closing');
    window.setTimeout(() => {
      action();
      window.setTimeout(() => {
        setCurtainPhase('opening');
        window.setTimeout(() => {
          setCurtainPhase('idle');
          curtainBusy.current = false;
        }, CURTAIN_OPEN_MS);
      }, CURTAIN_HOLD_MS);
    }, CURTAIN_CLOSE_MS);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <img className="app-logo" src="/logo.png" alt="心式麻將" />
        <span className="subtitle">XIN SHI MAHJONG</span>
      </header>

      <Toolbar
        difficulty={game.difficulty}
        isDailyChallenge={state.isDailyChallenge}
        dailyDoneToday={game.dailyDoneToday()}
        onChangeDifficulty={(d) => withCurtain(() => game.newGame({ difficulty: d }))}
        onNewGame={() => withCurtain(() => game.newGame())}
        onRestart={() => withCurtain(() => game.restart())}
        onDailyChallenge={() => withCurtain(() => game.startDailyChallenge())}
      />

      <GameStatus
        state={state}
        elapsedSec={game.elapsedSec}
        remaining={game.remaining}
        availablePairs={game.availablePairs}
        difficulty={game.difficulty}
        seed={game.seed}
        best={game.best}
      />

      <MagicItems
        items={state.items}
        inventory={state.inventory}
        onHint={game.doHint}
        onMagicRemove={game.doMagicRemove}
        onUndo={game.doUndo}
        onShuffle={game.doShuffle}
        onReveal={game.doReveal}
        onUnseal={game.doUnseal}
        disabled={state.status !== 'playing' && state.history.length === 0}
      />

      <div className="board-wrap">
        <Board
          board={state.board}
          selectedId={state.selectedId}
          hintIds={state.hintIds}
          onTileClick={game.clickTile}
        />

        {state.message ? <div className="message-toast">{state.message}</div> : null}

        {state.status === 'won' ? (
          <div className="overlay">
            <div className="overlay-card overlay-card--win">
              <h2>🎉 勝利！{state.isDailyChallenge ? <span className="daily-badge">每日挑戰</span> : null}</h2>
              <div className="overlay-grid">
                <div><span>分數</span><b>{state.score}</b></div>
                <div><span>步數</span><b>{state.moves}</b></div>
                <div><span>時間</span><b>{game.elapsedSec}s</b></div>
                <div><span>道具使用</span><b>{state.itemsUsedInGame}</b></div>
                <div><span>最高連擊</span><b>x{state.maxCombo}</b></div>
                <div><span>牌型</span><b>{state.layoutName}</b></div>
              </div>

              {state.lastReward ? (
                <div className="reward-box">
                  <div className="reward-title">過關獎勵</div>

                  {state.lastReward.bonuses.length > 0 ? (
                    <div className="reward-bonuses">
                      {state.lastReward.bonuses.map((b) => (
                        <span key={b} className="reward-bonus-chip">★ {b}</span>
                      ))}
                    </div>
                  ) : null}

                  <div
                    className={`reward-item reward-item--pop ${state.lastReward.granted ? '' : 'reward-item--full'}`}
                    style={{ borderColor: RARITY_COLORS[state.lastReward.rarity] }}
                  >
                    <div
                      className="reward-rarity"
                      style={{ color: RARITY_COLORS[state.lastReward.rarity] }}
                    >
                      {RARITY_NAMES[state.lastReward.rarity]}
                      {state.lastReward.granted ? '' : '（已滿額）'}
                    </div>
                    <div className="reward-name">
                      {ITEM_NAMES[state.lastReward.itemKey]}
                      {state.lastReward.granted ? '  ×1' : ' 已達上限'}
                    </div>
                    <div className="reward-after">
                      {state.lastReward.granted
                        ? `道具庫現有：${state.lastReward.inventoryAfter}`
                        : `改贈分數 +${state.lastReward.scoreBonus}`}
                    </div>
                  </div>

                  {state.lastReward.extra ? (
                    <div className="reward-item reward-item--extra reward-item--pop2">
                      <div className="reward-rarity" style={{ color: RARITY_COLORS.common }}>
                        連擊額外
                      </div>
                      <div className="reward-name">
                        {ITEM_NAMES[state.lastReward.extra.itemKey]}
                        {state.lastReward.extra.granted ? '  ×1' : ' 已達上限'}
                      </div>
                      {!state.lastReward.extra.granted ? (
                        <div className="reward-after">改贈分數 +{state.lastReward.extra.scoreBonus}</div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="overlay-actions">
                <button className="btn" onClick={() => withCurtain(() => game.restart())}>重新挑戰</button>
                <button className="btn btn--primary" onClick={() => withCurtain(() => game.newGame())}>下一局</button>
              </div>
            </div>
          </div>
        ) : null}

        {state.status === 'stuck' ? (
          <div className="overlay">
            <div className="overlay-card">
              <h2>😵 卡關了</h2>
              <p>目前沒有可配對的牌</p>
              <p>可使用「時光回溯」或「命運重排」繼續，或開始新局</p>
              <div className="overlay-actions">
                <button className="btn" onClick={game.doUndo} disabled={state.items.undo + state.inventory.undo <= 0 || state.history.length === 0}>時光回溯</button>
                <button className="btn" onClick={game.doShuffle} disabled={state.items.shuffle + state.inventory.shuffle <= 0}>命運重排</button>
                <button className="btn btn--primary" onClick={() => withCurtain(() => game.newGame())}>新局</button>
              </div>
            </div>
          </div>
        ) : null}

        {/* 窗簾只覆蓋牌盤區（技能欄下方），不遮工具列與狀態列 */}
        <Curtain phase={curtainPhase} />
      </div>

      <footer className="app-footer">
        <small>
          相同的兩張「可移動」牌可配對消除。冰封 / 鎖鏈牌不可配對，迷霧牌需先翻開。
          通關後會隨機贈送一個魔法道具進入道具庫，下一局可使用。
        </small>
      </footer>
    </div>
  );
};

export default App;
