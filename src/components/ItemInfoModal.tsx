import React from 'react';
import type { ItemKey } from '../game/types';
import {
  ITEM_NAMES,
  ITEM_RARITY,
  INVENTORY_CAPS,
  RARITY_NAMES,
  RARITY_COLORS,
} from '../game/inventory';

interface ItemInfo {
  key: ItemKey;
  emoji: string;
  desc: string;
  cost: number;
  initial: number;
}

const ITEMS: ItemInfo[] = [
  { key: 'hint',        emoji: '👁', desc: '高亮「一組」可配對的牌，不消除任何牌', cost: 10,  initial: 3 },
  { key: 'reveal',      emoji: '🌫', desc: '永久翻開所有迷霧牌（迷霧局有效）',     cost: 15,  initial: 1 },
  { key: 'unseal',      emoji: '🗝', desc: '解除一張冰封或鎖鏈牌（優先冰封）',     cost: 30,  initial: 1 },
  { key: 'magicRemove', emoji: '✨', desc: '自動消除一組合法可移動配對',           cost: 50,  initial: 2 },
  { key: 'undo',        emoji: '⏪', desc: '回復上一個操作（整盤狀態完整還原）',   cost: 20,  initial: 3 },
  { key: 'shuffle',     emoji: '🔀', desc: '重新分配剩餘牌的牌面，位置與數量不變', cost: 100, initial: 1 },
];

const MODIFIERS = [
  { emoji: '🌫', name: '迷霧局',     desc: '部分牌被霧遮住顯示「？」；變成可移動時自動翻開；可用「透視術」' },
  { emoji: '❄',  name: '冰封牌',     desc: '冰封牌不可配對；每消除 3 組自動解凍 1 張；可用「解封術」' },
  { emoji: '🔒', name: '鑰匙與鎖鏈', desc: '先消完所有「鑰匙」配對才會自動解開所有「鎖鏈」；可用「解封術」' },
];

interface Props { onClose: () => void }

const ItemInfoModal: React.FC<Props> = ({ onClose }) => {
  return (
    <div className="info-modal-overlay" onClick={onClose}>
      <div className="info-modal" onClick={(e) => e.stopPropagation()}>
        <button className="info-close" onClick={onClose} aria-label="關閉">✕</button>
        <h3 className="info-title">魔法道具</h3>
        <div className="info-list">
          {ITEMS.map((it) => (
            <div key={it.key} className="info-row">
              <span className="info-emoji">{it.emoji}</span>
              <div className="info-text">
                <div className="info-name">
                  {ITEM_NAMES[it.key]}
                  <span
                    className="info-rarity"
                    style={{ color: RARITY_COLORS[ITEM_RARITY[it.key]] }}
                  >
                    · {RARITY_NAMES[ITEM_RARITY[it.key]]}
                  </span>
                </div>
                <div className="info-desc">{it.desc}</div>
                <div className="info-meta">
                  初始 ×{it.initial}　扣分 -{it.cost}　持有上限 {INVENTORY_CAPS[it.key]}
                </div>
              </div>
            </div>
          ))}
        </div>

        <h3 className="info-title info-title--mt">特殊規則（困難難度）</h3>
        <div className="info-list">
          {MODIFIERS.map((m) => (
            <div key={m.name} className="info-row">
              <span className="info-emoji">{m.emoji}</span>
              <div className="info-text">
                <div className="info-name">{m.name}</div>
                <div className="info-desc">{m.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="info-footer">
          <small>道具使用優先消耗本局基本次數，用完才扣道具庫。</small>
        </div>
      </div>
    </div>
  );
};

export default ItemInfoModal;
