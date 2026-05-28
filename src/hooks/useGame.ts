import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty, GameState, ItemInventory } from '../game/types';
import { generateGame } from '../game/generator';
import { mulberry32 } from '../game/rng';
import {
  canMatch,
  getAvailableMatches,
  isStuck,
  isTileFree,
  isWin,
  remainingCount,
  removePair,
} from '../game/rules';
import {
  INITIAL_ITEMS,
  makeHistoryEntry,
  useBomb,
  useHint,
  useReveal,
  useShuffle,
  useUndo,
  useUnseal,
} from '../game/magicItems';
import { calcPairScore } from '../game/scoring';
import {
  drawReward,
  EMPTY_INVENTORY,
  loadInventory,
  saveInventory,
} from '../game/inventory';
import { postPairEffects } from '../game/roundModifiers';
import {
  isDailyDoneToday,
  saveDailyRecord,
  todayDailySeed,
  todayDateStr,
  todayRecord,
} from '../game/dailyChallenge';

const BEST_KEY = 'mahjong-solitaire:best';

export interface BestRecord {
  score: number;
  timeSec: number;
  date: string;
}

function loadBest(): BestRecord | null {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BestRecord;
  } catch { return null; }
}
function saveBest(rec: BestRecord) {
  try { localStorage.setItem(BEST_KEY, JSON.stringify(rec)); } catch { /* ignore */ }
}

function initialGameState(seed: number, difficulty: Difficulty, inventory: ItemInventory, isDailyChallenge = false): GameState {
  const result = generateGame({ seed, difficulty });
  return {
    board: result.board,
    selectedId: null,
    hintIds: null,
    score: 0,
    moves: 0,
    startTimeMs: Date.now(),
    endTimeMs: null,
    status: 'playing',
    items: { ...INITIAL_ITEMS },
    inventory,
    history: [],
    combo: 0,
    lastClearMs: 0,
    difficulty,
    seed,
    message: null,
    layoutKey: result.layoutKey,
    layoutName: result.layoutName,
    mirror: result.mirror,
    itemsUsedInGame: 0,
    lastReward: null,
    roundModifier: result.roundModifier,
    pairsSinceUnfreeze: 0,
    keysRemaining: result.keysRemaining,
    maxCombo: 0,
    isDailyChallenge,
  };
}

export interface UseGameOptions {
  /** 道具特效觸發 callback（如 auto-shuffle 時用） */
  onEffect?: (key: 'hint' | 'reveal' | 'unseal' | 'magicRemove' | 'undo' | 'shuffle') => void;
}

export function useGame(opts?: UseGameOptions) {
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 1_000_000_000));
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [persistedInventory, setPersistedInventory] = useState<ItemInventory>(() => {
    if (typeof window === 'undefined') return { ...EMPTY_INVENTORY };
    return loadInventory();
  });
  const [state, setState] = useState<GameState>(() => initialGameState(seed, 'normal', persistedInventory));
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [best, setBest] = useState<BestRecord | null>(() => loadBest());
  const messageTimer = useRef<number | null>(null);
  const rewardedRef = useRef<boolean>(false);

  useEffect(() => {
    if (state.status !== 'playing') return;
    const id = window.setInterval(() => setNowMs(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [state.status]);

  useEffect(() => {
    if (!state.message) return;
    if (messageTimer.current) window.clearTimeout(messageTimer.current);
    messageTimer.current = window.setTimeout(() => {
      setState((prev) => (prev.message ? { ...prev, message: null } : prev));
    }, 2500);
    return () => { if (messageTimer.current) window.clearTimeout(messageTimer.current); };
  }, [state.message]);

  useEffect(() => {
    saveInventory(state.inventory);
    setPersistedInventory(state.inventory);
  }, [state.inventory]);

  const newGame = useCallback((opts?: { seed?: number; difficulty?: Difficulty }) => {
    const nextSeed = opts?.seed ?? Math.floor(Math.random() * 1_000_000_000);
    const nextDiff = opts?.difficulty ?? difficulty;
    setSeed(nextSeed);
    setDifficulty(nextDiff);
    const inv = loadInventory();
    setPersistedInventory(inv);
    setState(initialGameState(nextSeed, nextDiff, inv, false));
    setNowMs(Date.now());
    rewardedRef.current = false;
  }, [difficulty]);

  const restart = useCallback(() => {
    const inv = loadInventory();
    setPersistedInventory(inv);
    setState((prev) => initialGameState(seed, difficulty, inv, prev.isDailyChallenge));
    setNowMs(Date.now());
    rewardedRef.current = false;
  }, [seed, difficulty]);

  // 開啟今日的每日挑戰；若今日已通關，仍可遊玩但獎勵不再保底（避免重複領）
  const startDailyChallenge = useCallback(() => {
    const dailySeed = todayDailySeed();
    setSeed(dailySeed);
    // 每日挑戰固定使用 hard 難度，提升挑戰感
    const dailyDiff: Difficulty = 'hard';
    setDifficulty(dailyDiff);
    const inv = loadInventory();
    setPersistedInventory(inv);
    setState(initialGameState(dailySeed, dailyDiff, inv, true));
    setNowMs(Date.now());
    rewardedRef.current = false;
  }, []);

  const clickTile = useCallback((tileId: number) => {
    setState((prev) => {
      if (prev.status !== 'playing') return prev;
      const tile = prev.board.find((t) => t.id === tileId);
      if (!tile || tile.removed) return prev;

      // 特殊狀態提示
      if (tile.modifier === 'frozen') return { ...prev, message: '這張牌被冰封了' };
      if (tile.modifier === 'locked') return { ...prev, message: `這張牌被鎖住，剩 ${prev.keysRemaining} 對鑰匙` };

      if (!isTileFree(tile, prev.board)) return { ...prev, message: '這張牌目前無法移動' };

      if (prev.selectedId === tileId) return { ...prev, selectedId: null, hintIds: null };
      if (prev.selectedId === null) return { ...prev, selectedId: tileId, hintIds: null, message: null };

      const other = prev.board.find((t) => t.id === prev.selectedId);
      if (!other) return { ...prev, selectedId: tileId };
      if (!canMatch(tile, other)) return { ...prev, selectedId: tileId, message: '兩張牌不相同' };
      const newBoard = removePair(tile.id, other.id, prev.board);
      if (!newBoard) return { ...prev, selectedId: tileId, message: '無法配對' };

      const now = Date.now();
      const { delta, nextCombo } = calcPairScore(now, prev.lastClearMs, prev.combo);
      const newScore = prev.score + delta;
      const nextMaxCombo = Math.max(prev.maxCombo, nextCombo);

      const history = [...prev.history, makeHistoryEntry(prev)];

      // 觸發 round modifier 後續效果
      const post = postPairEffects(
        newBoard, tile.id, other.id, prev.roundModifier,
        prev.pairsSinceUnfreeze, prev.keysRemaining,
      );

      let status: GameState['status'] = 'playing';
      let endTimeMs: number | null = null;
      if (isWin(post.board)) { status = 'won'; endTimeMs = now; }
      else if (isStuck(post.board)) { status = 'stuck'; }

      const baseMsg =
        status === 'won' ? `勝利！+${delta} 分`
          : nextCombo > 1 ? `連擊 x${nextCombo}！+${delta} 分`
          : `配對成功 +${delta} 分`;
      const message = post.event ? `${baseMsg}  /  ${post.event}` : baseMsg;

      return {
        ...prev,
        board: post.board,
        selectedId: null,
        hintIds: null,
        score: newScore,
        moves: prev.moves + 1,
        combo: nextCombo,
        maxCombo: nextMaxCombo,
        lastClearMs: now,
        history,
        status,
        endTimeMs,
        pairsSinceUnfreeze: post.pairsSinceUnfreeze,
        keysRemaining: post.keysRemaining,
        message,
      };
    });
  }, []);

  // 共用工具：依新棋盤狀態決定 status（win / stuck / playing）
  const resolveStatus = (board: GameState['board'], current: GameState): GameState['status'] => {
    if (isWin(board)) return 'won';
    if (isStuck(board)) return 'stuck';
    return 'playing';
  };

  const doHint = useCallback(() => setState((s) => useHint(s).state), []);
  // 炸彈：傳入目標 tileId，會隨機選一張同牌面組對炸掉（繞過 free / match 限制）
  const doBomb = useCallback((tileId: number) => setState((s) => {
    const rand = mulberry32((s.seed ^ tileId ^ Date.now()) | 0);
    const r = useBomb(s, tileId, rand);
    if (!r.changed) return r.state;
    const status = resolveStatus(r.state.board, r.state);
    return { ...r.state, status, endTimeMs: status === 'won' ? Date.now() : null };
  }), []);
  const doUndo = useCallback(() => setState((s) => useUndo(s).state), []);
  const doShuffle = useCallback(() => setState((s) => {
    const r = useShuffle(s);
    if (!r.changed) return r.state;
    const status = resolveStatus(r.state.board, r.state);
    return { ...r.state, status, endTimeMs: status === 'won' ? Date.now() : null };
  }), []);
  const doReveal = useCallback(() => setState((s) => {
    const r = useReveal(s);
    if (!r.changed) return r.state;
    const status = resolveStatus(r.state.board, r.state);
    return { ...r.state, status, endTimeMs: status === 'won' ? Date.now() : null };
  }), []);
  const doUnseal = useCallback(() => setState((s) => {
    const r = useUnseal(s);
    if (!r.changed) return r.state;
    const status = resolveStatus(r.state.board, r.state);
    return { ...r.state, status, endTimeMs: status === 'won' ? Date.now() : null };
  }), []);

  const elapsedSec = useMemo(() => {
    const end = state.endTimeMs ?? nowMs;
    return Math.max(0, Math.floor((end - state.startTimeMs) / 1000));
  }, [nowMs, state.startTimeMs, state.endTimeMs]);
  const remaining = useMemo(() => remainingCount(state.board), [state.board]);
  const availablePairs = useMemo(() => getAvailableMatches(state.board).length, [state.board]);

  useEffect(() => {
    if (state.status !== 'won') return;
    if (rewardedRef.current) return;
    rewardedRef.current = true;

    const rec: BestRecord = {
      score: state.score,
      timeSec: elapsedSec,
      date: new Date().toISOString(),
    };
    if (!best || rec.score > best.score) {
      saveBest(rec);
      setBest(rec);
    }

    // 若是每日挑戰且今日尚未完成 → 啟用保底；已完成則不再保底
    const dailyAlreadyDone = state.isDailyChallenge && isDailyDoneToday();
    const isDailyForBonus = state.isDailyChallenge && !dailyAlreadyDone;

    const ctx = {
      difficulty: state.difficulty,
      itemsUsedInGame: state.itemsUsedInGame,
      maxCombo: state.maxCombo,
      elapsedSec,
      isDailyChallenge: isDailyForBonus,
    };

    const rand = mulberry32(state.seed ^ state.score ^ Math.floor(Date.now() / 1000));
    const { reward, nextInventory } = drawReward(state.inventory, rand, ctx);
    let bonusScore = reward.granted ? 0 : reward.scoreBonus;
    if (reward.extra && !reward.extra.granted) bonusScore += reward.extra.scoreBonus;

    // 寫入每日挑戰完成紀錄（一日只記第一次）
    if (state.isDailyChallenge && !dailyAlreadyDone) {
      saveDailyRecord({
        date: todayDateStr(),
        completed: true,
        score: state.score + bonusScore,
        timeSec: elapsedSec,
      });
    }

    setState((prev) => ({
      ...prev,
      inventory: nextInventory,
      score: prev.score + bonusScore,
      lastReward: reward,
    }));
  }, [state.status]);

  // 自動完成：剩 ≤ 4 張時自動清掉並轉為勝利（每張 +50 分加成）
  useEffect(() => {
    if (state.status !== 'playing') return;
    const remaining = remainingCount(state.board);
    if (remaining === 0 || remaining > 4) return;

    const id = window.setTimeout(() => {
      setState((s) => {
        if (s.status !== 'playing') return s;
        const rem = remainingCount(s.board);
        if (rem === 0 || rem > 4) return s;
        const newBoard = s.board.map((t) => (t.removed ? t : { ...t, removed: true }));
        const bonus = rem * 50;
        return {
          ...s,
          board: newBoard,
          status: 'won',
          endTimeMs: Date.now(),
          score: s.score + bonus,
          message: `🎊 剩 ${rem} 張自動完成！+${bonus} 分`,
        };
      });
    }, 700);
    return () => window.clearTimeout(id);
  }, [state.board, state.status]);

  // 卡關自動命運重排：若 status='stuck' 且還有 shuffle 道具，延遲後自動觸發
  const onEffectRef = useRef(opts?.onEffect);
  useEffect(() => { onEffectRef.current = opts?.onEffect; });

  useEffect(() => {
    if (state.status !== 'stuck') return;
    const totalShuffle = state.items.shuffle + state.inventory.shuffle;
    if (totalShuffle <= 0) return; // 沒道具則正常顯示卡關畫面

    const id = window.setTimeout(() => {
      setState((s) => {
        if (s.status !== 'stuck') return s; // 期間狀態已變
        const r = useShuffle(s);
        if (!r.changed) return s;
        const stillStuck = isStuck(r.state.board);
        return {
          ...r.state,
          status: stillStuck ? 'stuck' : 'playing',
          message: stillStuck
            ? '命運重排後仍卡關，自動再試一次…'
            : '卡關！自動觸發命運重排（-100 分）',
        };
      });
      onEffectRef.current?.('shuffle');
    }, 700);
    return () => window.clearTimeout(id);
  }, [state.status, state.items.shuffle, state.inventory.shuffle]);

  return {
    state,
    elapsedSec,
    remaining,
    availablePairs,
    seed,
    difficulty,
    best,
    inventory: state.inventory,
    persistedInventory,
    clickTile,
    newGame,
    restart,
    setDifficulty,
    doHint,
    doBomb,
    doUndo,
    doShuffle,
    doReveal,
    doUnseal,
    startDailyChallenge,
    dailyDoneToday: () => isDailyDoneToday(),
    todayDailyRecord: () => todayRecord(),
  };
}
