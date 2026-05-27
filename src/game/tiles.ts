import type { TileType } from './types';

// 建立完整 144 張的麻將牌組 (MVP 不含花季牌)
// 1-9 dot/bam/crak x 4 = 108
// 4 winds x 4 = 16
// 3 dragons x 4 = 12
// 總計 136 張 (傳統麻將牌數，少了 8 張花季牌)
export function buildStandardDeck(): TileType[] {
  const deck: TileType[] = [];

  const suits: Array<'dot' | 'bam' | 'crak'> = ['dot', 'bam', 'crak'];
  for (const suit of suits) {
    for (let n = 1; n <= 9; n++) {
      for (let copy = 0; copy < 4; copy++) {
        deck.push(`${suit}-${n}`);
      }
    }
  }

  const winds = ['east', 'south', 'west', 'north'];
  for (const w of winds) {
    for (let copy = 0; copy < 4; copy++) {
      deck.push(`wind-${w}`);
    }
  }

  const dragons = ['red', 'green', 'white'];
  for (const d of dragons) {
    for (let copy = 0; copy < 4; copy++) {
      deck.push(`dragon-${d}`);
    }
  }

  return deck; // 136 張
}

// 牌面顯示文字 (CSS render)
export function getTileFace(tileType: TileType): { text: string; color: string; small?: string } {
  const [suit, value] = tileType.split('-');
  switch (suit) {
    case 'dot':
      return { text: ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'][Number(value)] ?? value, color: '#1e88e5', small: '筒' };
    case 'bam':
      return { text: value, color: '#2e7d32', small: '條' };
    case 'crak':
      return { text: ['', '萬', '萬', '萬', '萬', '萬', '萬', '萬', '萬', '萬'][Number(value)] ?? '萬', color: '#c62828', small: value };
    case 'wind': {
      const map: Record<string, string> = { east: '東', south: '南', west: '西', north: '北' };
      return { text: map[value] ?? value, color: '#37474f' };
    }
    case 'dragon': {
      const map: Record<string, { text: string; color: string }> = {
        red: { text: '中', color: '#d32f2f' },
        green: { text: '發', color: '#388e3c' },
        white: { text: '⬜', color: '#90a4ae' },
      };
      return map[value] ?? { text: value, color: '#000' };
    }
    default:
      return { text: tileType, color: '#000' };
  }
}
