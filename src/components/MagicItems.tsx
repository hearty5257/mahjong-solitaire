import React from 'react';
import type { ItemInventory, ItemKey, MagicItemState } from '../game/types';

interface Props {
  items: MagicItemState;
  inventory: ItemInventory;
  onHint: () => void;
  onMagicRemove: () => void;
  onUndo: () => void;
  onShuffle: () => void;
  onReveal: () => void;
  onUnseal: () => void;
  disabled?: boolean;
}

interface ItemMeta { key: ItemKey; label: string; emoji: string; desc: string }

const ITEMS: ItemMeta[] = [
  { key: 'hint',        label: '靈視提示', emoji: '👁',  desc: '高亮一組可配對牌（不消除）' },
  { key: 'reveal',      label: '透視術',   emoji: '🌫',  desc: '永久翻開所有迷霧牌（僅 fog 模式有效）' },
  { key: 'unseal',      label: '解封術',   emoji: '🗝',  desc: '解除一張冰封或鎖鏈牌' },
  { key: 'magicRemove', label: '魔法消除', emoji: '✨',  desc: '自動消除一組可配對牌' },
  { key: 'undo',        label: '時光回溯', emoji: '⏪',  desc: '回復上一個操作' },
  { key: 'shuffle',     label: '命運重排', emoji: '🔀',  desc: '重新分配剩餘牌的牌面' },
];

const MagicItems: React.FC<Props> = ({
  items, inventory,
  onHint, onMagicRemove, onUndo, onShuffle, onReveal, onUnseal,
  disabled,
}) => {
  const handlers: Record<ItemKey, () => void> = {
    hint: onHint,
    magicRemove: onMagicRemove,
    undo: onUndo,
    shuffle: onShuffle,
    reveal: onReveal,
    unseal: onUnseal,
  };

  return (
    <div className="magic-items">
      {ITEMS.map((item) => {
        const base = items[item.key];
        const inv = inventory[item.key];
        const total = base + inv;
        const isDisabled = disabled || total <= 0;
        return (
          <button
            key={item.key}
            className={`magic-btn ${isDisabled ? 'magic-btn--disabled' : ''}`}
            onClick={handlers[item.key]}
            disabled={isDisabled}
            title={`${item.desc}\n本局基本 ${base} + 道具庫 ${inv}`}
          >
            <span className="magic-emoji">{item.emoji}</span>
            <span className="magic-label">{item.label}</span>
            <span className="magic-count">x{total}</span>
            {inv > 0 ? <span className="magic-inv-badge">+{inv}</span> : null}
          </button>
        );
      })}
    </div>
  );
};

export default MagicItems;
