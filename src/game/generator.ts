import type { BoardState, Difficulty, LayoutSlot, RoundModifier, TileType } from './types';
import { buildStandardDeck } from './tiles';
import { getLayoutByKey, LAYOUTS, LayoutKey, pickLayoutKey } from './layout';
import { getAvailableMatches } from './rules';
import { mulberry32, shuffleInPlace } from './rng';
import { applyRoundModifier, pickRoundModifier } from './roundModifiers';

// 為向後相容，re-export PRNG
export { mulberry32, shuffleInPlace };

export interface GenerateOptions {
  seed: number;
  difficulty: Difficulty;
  layoutKey?: LayoutKey;
  mirror?: boolean;
  roundModifier?: RoundModifier;
  maxRetry?: number;
}

export interface GenerateResult {
  board: BoardState;
  layoutKey: LayoutKey;
  layoutName: string;
  mirror: boolean;
  roundModifier: RoundModifier;
  keysRemaining: number;
}

function dealRandom(layout: LayoutSlot[], deck: TileType[], rand: () => number): BoardState {
  const tilesToUse = deck.slice(0, layout.length);
  shuffleInPlace(tilesToUse, rand);
  return layout.map((slot, idx) => ({
    id: idx,
    tileType: tilesToUse[idx],
    x: slot.x,
    y: slot.y,
    z: slot.z,
    removed: false,
  }));
}

function difficultyMinPairs(d: Difficulty): number {
  switch (d) {
    case 'easy': return 6;
    case 'normal': return 3;
    case 'hard': return 1;
  }
}

export function generateGame(opts: GenerateOptions): GenerateResult {
  const { seed, difficulty } = opts;
  const maxRetry = opts.maxRetry ?? 80;
  const layoutKey: LayoutKey = opts.layoutKey ?? pickLayoutKey(seed, difficulty);
  const mirror = opts.mirror ?? (((seed >>> 3) & 1) === 1);
  const roundModifier: RoundModifier = opts.roundModifier ?? pickRoundModifier(seed, difficulty);

  const layout = getLayoutByKey(layoutKey, { mirror });
  const baseDeck = buildStandardDeck();
  while (baseDeck.length < layout.length) {
    baseDeck.push(...baseDeck.slice(0, layout.length - baseDeck.length));
  }
  const deck = baseDeck.slice(0, layout.length);
  if (deck.length % 2 !== 0) deck.pop();

  const minPairs = difficultyMinPairs(difficulty);

  let lastBoard: BoardState | null = null;
  for (let attempt = 0; attempt < maxRetry; attempt++) {
    const rand = mulberry32(seed + attempt * 1009);
    const board = dealRandom(layout, deck, rand);
    const pairs = getAvailableMatches(board);
    lastBoard = board;
    if (pairs.length >= minPairs) {
      const applied = applyRoundModifier(board, roundModifier, seed);
      return {
        board: applied.board,
        layoutKey,
        layoutName: LAYOUTS[layoutKey].name,
        mirror,
        roundModifier,
        keysRemaining: applied.keysRemaining,
      };
    }
  }
  const fallback = lastBoard ?? dealRandom(layout, deck, mulberry32(seed));
  const applied = applyRoundModifier(fallback, roundModifier, seed);
  return {
    board: applied.board,
    layoutKey,
    layoutName: LAYOUTS[layoutKey].name,
    mirror,
    roundModifier,
    keysRemaining: applied.keysRemaining,
  };
}

// 命運重排：保留位置與 modifier，只重新分配剩餘牌的 tileType
export function shuffleRemainingTiles(board: BoardState, seed: number, maxRetry = 40): BoardState {
  const remaining = board.filter((t) => !t.removed);
  if (remaining.length === 0) return board;
  const remainingTypes = remaining.map((t) => t.tileType);

  for (let attempt = 0; attempt < maxRetry; attempt++) {
    const rand = mulberry32(seed + attempt * 2003);
    const shuffled = remainingTypes.slice();
    shuffleInPlace(shuffled, rand);
    const newBoard: BoardState = board.map((t) => {
      if (t.removed) return t;
      const newType = shuffled.shift()!;
      return { ...t, tileType: newType };
    });
    if (getAvailableMatches(newBoard).length > 0) return newBoard;
  }
  const rand = mulberry32(seed + 99991);
  const shuffled = remainingTypes.slice();
  shuffleInPlace(shuffled, rand);
  return board.map((t) => {
    if (t.removed) return t;
    return { ...t, tileType: shuffled.shift()! };
  });
}
