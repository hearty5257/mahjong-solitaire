import { describe, it, expect } from 'vitest';
import {
  drawReward,
  EMPTY_INVENTORY,
  FULL_COMPENSATION,
  INVENTORY_CAPS,
  ITEM_RARITY,
  COMBO_BONUS_THRESHOLD,
} from '../src/game/inventory';
import { mulberry32 } from '../src/game/rng';
import type { ItemInventory, RewardContext } from '../src/game/types';

describe('drawReward', () => {
  it('未滿時：給的道具會加 1', () => {
    const rand = mulberry32(1);
    const { reward, nextInventory } = drawReward({ ...EMPTY_INVENTORY }, rand);
    expect(reward.granted).toBe(true);
    expect(reward.scoreBonus).toBe(0);
    expect(nextInventory[reward.itemKey]).toBe(1);
  });

  it('滿額時：不增加數量，改給該稀有度的補償分數', () => {
    // 把所有道具都填滿
    const inv: ItemInventory = { ...EMPTY_INVENTORY };
    for (const k of Object.keys(INVENTORY_CAPS) as Array<keyof typeof INVENTORY_CAPS>) {
      inv[k] = INVENTORY_CAPS[k];
    }
    const rand = mulberry32(2);
    const { reward, nextInventory } = drawReward(inv, rand);
    expect(reward.granted).toBe(false);
    expect(reward.scoreBonus).toBe(FULL_COMPENSATION[reward.rarity]);
    expect(nextInventory[reward.itemKey]).toBe(INVENTORY_CAPS[reward.itemKey]);
  });

  it('道具庫永遠不會出現負數', () => {
    let inv: ItemInventory = { ...EMPTY_INVENTORY };
    let rand = mulberry32(42);
    for (let i = 0; i < 500; i++) {
      const r = drawReward(inv, rand);
      inv = r.nextInventory;
      for (const k of Object.keys(inv) as Array<keyof ItemInventory>) {
        expect(inv[k]).toBeGreaterThanOrEqual(0);
        expect(inv[k]).toBeLessThanOrEqual(INVENTORY_CAPS[k]);
      }
      rand = mulberry32(42 + i + 1);
    }
  });

  it('史詩道具不會頻繁出現 (1000 次中佔比 ≈ 10%)', () => {
    let epicCount = 0;
    let total = 1000;
    for (let i = 0; i < total; i++) {
      const rand = mulberry32(i * 13 + 7);
      const { reward } = drawReward({ ...EMPTY_INVENTORY }, rand);
      if (ITEM_RARITY[reward.itemKey] === 'epic') epicCount++;
    }
    const ratio = epicCount / total;
    expect(ratio).toBeLessThan(0.2);
    expect(ratio).toBeGreaterThan(0.03);
  });

  it('每日挑戰：抽到 common 時保底升 rare', () => {
    // 透過固定 seed 找一個會抽到 common 的 case
    let foundCase = false;
    for (let i = 0; i < 200; i++) {
      const noCtx = drawReward({ ...EMPTY_INVENTORY }, mulberry32(i));
      if (noCtx.reward.rarity !== 'common') continue;
      const ctx: RewardContext = {
        difficulty: 'normal', itemsUsedInGame: 1, maxCombo: 0, elapsedSec: 600, isDailyChallenge: true,
      };
      const withCtx = drawReward({ ...EMPTY_INVENTORY }, mulberry32(i), ctx);
      expect(withCtx.reward.rarity === 'rare' || withCtx.reward.rarity === 'epic').toBe(true);
      expect(withCtx.reward.bonuses).toContain('每日挑戰保底');
      foundCase = true;
      break;
    }
    expect(foundCase).toBe(true);
  });

  it('困難難度 + 未使用道具 → 加成訊息出現', () => {
    const ctx: RewardContext = {
      difficulty: 'hard', itemsUsedInGame: 0, maxCombo: 0, elapsedSec: 600, isDailyChallenge: false,
    };
    const r = drawReward({ ...EMPTY_INVENTORY }, mulberry32(1), ctx);
    expect(r.reward.bonuses).toContain('困難難度加成');
    expect(r.reward.bonuses).toContain('未使用道具加成');
  });

  it(`maxCombo >= ${COMBO_BONUS_THRESHOLD} 時，多次抽獎平均應有 extra reward 出現`, () => {
    const ctx: RewardContext = {
      difficulty: 'normal', itemsUsedInGame: 5, maxCombo: COMBO_BONUS_THRESHOLD + 2, elapsedSec: 600, isDailyChallenge: false,
    };
    let extraCount = 0;
    const N = 100;
    for (let i = 0; i < N; i++) {
      const r = drawReward({ ...EMPTY_INVENTORY }, mulberry32(i * 31 + 5), ctx);
      if (r.reward.extra) extraCount++;
    }
    expect(extraCount).toBeGreaterThan(N * 0.3);
  });

  it('未達 combo 門檻時：不會出 extra reward', () => {
    const ctx: RewardContext = {
      difficulty: 'normal', itemsUsedInGame: 5, maxCombo: COMBO_BONUS_THRESHOLD - 1, elapsedSec: 600, isDailyChallenge: false,
    };
    for (let i = 0; i < 30; i++) {
      const r = drawReward({ ...EMPTY_INVENTORY }, mulberry32(i), ctx);
      expect(r.reward.extra).toBeUndefined();
    }
  });
});
