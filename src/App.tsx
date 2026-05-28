import React, { useCallback, useRef, useState } from 'react';
import { useGame } from './hooks/useGame';
import type { Difficulty } from './game/types';
import Board from './components/Board';
import GameStatus from './components/GameStatus';
import MagicItems from './components/MagicItems';
import Toolbar from './components/Toolbar';
import Curtain, { CurtainPhase } from './components/Curtain';
import ItemInfoModal from './components/ItemInfoModal';
import EffectLayer, { EffectKey } from './components/EffectLayer';
import { ITEM_NAMES, RARITY_COLORS, RARITY_NAMES } from './game/inventory';

const CURTAIN_CLOSE_MS = 600;
const CURTAIN_HOLD_MS = 120;
const CURTAIN_OPEN_MS = 600;

type View = 'landing' | 'game';

const App: React.FC = () => {
  const game = useGame();
  const { state } = game;

  const [view, setView] = useState<View>('landing');
  const [landingDifficulty, setLandingDifficulty] = useState<Difficulty>('normal');
  const [curtainPhase, setCurtainPhase] = useState<CurtainPhase>('idle');
  const [curtainFullscreen, setCurtainFullscreen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [effect, setEffect] = useState<EffectKey | null>(null);
  const curtainBusy = useRef(false);

  // 包一層：先 closing → action → opening → idle
  // fullscreen=true 時窗簾覆蓋整頁（landing ↔ game 切換用），否則只蓋牌盤
  const withCurtain = useCallback((action: () => void, fullscreen = false) => {
    if (curtainBusy.current) return;
    curtainBusy.current = true;
    setCurtainFullscreen(fullscreen);
    setCurtainPhase('closing');
    window.setTimeout(() => {
      action();
      window.setTimeout(() => {
        setCurtainPhase('opening');
        window.setTimeout(() => {
          setCurtainPhase('idle');
          setCurtainFullscreen(false);
          curtainBusy.current = false;
        }, CURTAIN_OPEN_MS);
      }, CURTAIN_HOLD_MS);
    }, CURTAIN_CLOSE_MS);
  }, []);

  // 道具觸發特效（只在道具實際可用 + 有目標時才播）
  const totalItem = (k: 'hint' | 'reveal' | 'unseal' | 'magicRemove' | 'undo' | 'shuffle') =>
    state.items[k] + state.inventory[k];
  const hasAvailablePair = game.availablePairs > 0;
  const hasFog = state.board.some((t) => t.modifier === 'fog' && !t.revealed && !t.removed);
  const hasSealed = state.board.some(
    (t) => (t.modifier === 'frozen' || t.modifier === 'locked') && !t.removed,
  );

  const fxHint = () => {
    if (totalItem('hint') > 0 && hasAvailablePair) setEffect('hint');
    game.doHint();
  };
  const fxReveal = () => {
    if (totalItem('reveal') > 0 && hasFog) setEffect('reveal');
    game.doReveal();
  };
  const fxUnseal = () => {
    if (totalItem('unseal') > 0 && hasSealed) setEffect('unseal');
    game.doUnseal();
  };
  const fxMagicRemove = () => {
    if (totalItem('magicRemove') > 0 && hasAvailablePair) setEffect('magicRemove');
    game.doMagicRemove();
  };
  const fxUndo = () => {
    if (totalItem('undo') > 0 && state.history.length > 0) setEffect('undo');
    game.doUndo();
  };
  const fxShuffle = () => {
    if (totalItem('shuffle') > 0) setEffect('shuffle');
    game.doShuffle();
  };

  // 從首頁進入遊戲
  const goToGame = useCallback((opts?: { difficulty?: Difficulty; daily?: boolean }) => {
    withCurtain(() => {
      setView('game');
      if (opts?.daily) {
        game.startDailyChallenge();
      } else {
        game.newGame({ difficulty: opts?.difficulty ?? landingDifficulty });
      }
    }, true);
  }, [game, landingDifficulty, withCurtain]);

  // 回到首頁
  const goToLanding = useCallback(() => {
    withCurtain(() => setView('landing'), true);
  }, [withCurtain]);

  // 全螢幕窗簾（landing/game 切換時）
  const fullscreenCurtain = curtainFullscreen ? <Curtain phase={curtainPhase} fullscreen /> : null;

  // ============ Landing View ============
  if (view === 'landing') {
    return (
      <div className="app app--landing">
        <div className="landing">
          <img
            className="landing-logo"
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt="心式麻將"
          />

          <div className="landing-actions">
            {/* 難度選擇 — 三顆大按鈕 */}
            <div className="landing-difficulty-label">選擇難度</div>
            <div className="difficulty-buttons">
              {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  className={`difficulty-btn ${landingDifficulty === d ? 'difficulty-btn--active' : ''}`}
                  onClick={() => setLandingDifficulty(d)}
                >
                  <div className="difficulty-name">
                    {d === 'easy' ? '簡單' : d === 'normal' ? '普通' : '困難'}
                  </div>
                  <div className="difficulty-desc">
                    {d === 'easy'
                      ? '經典龜形'
                      : d === 'normal'
                        ? '六種牌型'
                        : '九種牌型 + 特殊規則'}
                  </div>
                </button>
              ))}
            </div>

            <button
              className="btn btn--primary btn--start"
              onClick={() => goToGame()}
            >
              開始遊戲
            </button>

            <button
              className={`btn btn--daily ${game.dailyDoneToday() ? 'btn--daily-active' : ''}`}
              onClick={() => goToGame({ daily: true })}
              title={game.dailyDoneToday() ? '今日已通關' : '每日固定牌局，保底贈送 Rare 道具'}
            >
              每日挑戰 {game.dailyDoneToday() ? '✓' : '🗓'}
            </button>
          </div>

          {game.best ? (
            <div className="landing-info">
              <span>最佳分數：</span><b>{game.best.score}</b>
              <span style={{ marginLeft: 12 }}>道具庫：</span>
              <b>{Object.values(state.inventory).reduce((a, b) => a + b, 0)} 件</b>
            </div>
          ) : null}

          <div className="landing-tip">
            點兩張相同且可移動的牌即可消除。
            可移動 = 上方沒有牌覆蓋、左或右一邊開放。
          </div>
        </div>

        {fullscreenCurtain}
      </div>
    );
  }

  // ============ Game View ============
  return (
    <div className="app app--game">
      <Toolbar
        difficulty={game.difficulty}
        isDailyChallenge={state.isDailyChallenge}
        dailyDoneToday={game.dailyDoneToday()}
        onChangeDifficulty={(d) => withCurtain(() => game.newGame({ difficulty: d }))}
        onNewGame={() => withCurtain(() => game.newGame())}
        onRestart={() => withCurtain(() => game.restart())}
        onDailyChallenge={() => withCurtain(() => game.startDailyChallenge())}
        onHome={goToLanding}
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
        onHint={fxHint}
        onMagicRemove={fxMagicRemove}
        onUndo={fxUndo}
        onShuffle={fxShuffle}
        onReveal={fxReveal}
        onUnseal={fxUnseal}
        disabled={state.status !== 'playing' && state.history.length === 0}
      />

      <div className="board-wrap">
        <button
          className="info-btn"
          onClick={() => setShowInfo(true)}
          aria-label="道具說明"
          title="道具說明"
        >
          i
        </button>

        <Board
          board={state.board}
          selectedId={state.selectedId}
          hintIds={state.hintIds}
          onTileClick={game.clickTile}
        />

        {state.message ? <div className="message-toast">{state.message}</div> : null}

        {showInfo ? <ItemInfoModal onClose={() => setShowInfo(false)} /> : null}

        <EffectLayer effect={effect} onDone={() => setEffect(null)} />

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
                <button className="btn" onClick={goToLanding}>回首頁</button>
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

        {/* 牌盤內窗簾（新局 / 重新開始時） */}
        {!curtainFullscreen ? <Curtain phase={curtainPhase} /> : null}
      </div>

      {fullscreenCurtain}
    </div>
  );
};

export default App;
