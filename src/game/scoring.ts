export const SCORE_PAIR = 100;
export const SCORE_COMBO_WINDOW_MS = 4000; // 連擊時間窗
export const SCORE_COMBO_BONUS = 25;        // 每連擊一次的額外加成

export const COST_HINT = 10;
export const COST_MAGIC_REMOVE = 50;
export const COST_UNDO = 20;
export const COST_SHUFFLE = 100;

// 計算配對得分 (包含 combo bonus)
// 若距離上次成功消除小於 SCORE_COMBO_WINDOW_MS 則 combo +1，得分多加 combo * SCORE_COMBO_BONUS
export function calcPairScore(now: number, lastClearMs: number, combo: number): { delta: number; nextCombo: number } {
  if (lastClearMs > 0 && now - lastClearMs <= SCORE_COMBO_WINDOW_MS) {
    const nextCombo = combo + 1;
    return { delta: SCORE_PAIR + nextCombo * SCORE_COMBO_BONUS, nextCombo };
  }
  return { delta: SCORE_PAIR, nextCombo: 1 };
}
