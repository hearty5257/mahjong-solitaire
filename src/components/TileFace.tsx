import React from 'react';

// 傳統麻將牌面 SVG 元件
// viewBox 統一採 0 0 24 32（牌面比例略偏直長，符合傳統麻將牌）

const COLOR_RED = '#c0392b';
const COLOR_GREEN = '#1e7a3e';
const COLOR_BLUE = '#1f5fa8';
const COLOR_DARK = '#222';

interface Dot { cx: number; cy: number; color: string }

// 筒子點位（24x32 viewBox）
function dotPositions(n: number): Dot[] {
  const R = COLOR_RED, G = COLOR_GREEN, B = COLOR_BLUE;
  switch (n) {
    case 1:
      return [{ cx: 12, cy: 16, color: R }];
    case 2:
      return [
        { cx: 12, cy: 8, color: G }, { cx: 12, cy: 24, color: G },
      ];
    case 3:
      return [
        { cx: 6, cy: 6, color: R }, { cx: 12, cy: 16, color: G }, { cx: 18, cy: 26, color: B },
      ];
    case 4:
      return [
        { cx: 7, cy: 8, color: G }, { cx: 17, cy: 8, color: G },
        { cx: 7, cy: 24, color: R }, { cx: 17, cy: 24, color: R },
      ];
    case 5:
      return [
        { cx: 6, cy: 7, color: B }, { cx: 18, cy: 7, color: B },
        { cx: 12, cy: 16, color: R },
        { cx: 6, cy: 25, color: B }, { cx: 18, cy: 25, color: B },
      ];
    case 6:
      return [
        { cx: 7, cy: 6, color: G }, { cx: 17, cy: 6, color: G },
        { cx: 7, cy: 16, color: G }, { cx: 17, cy: 16, color: G },
        { cx: 7, cy: 26, color: G }, { cx: 17, cy: 26, color: G },
      ];
    case 7:
      return [
        { cx: 6, cy: 5, color: R }, { cx: 12, cy: 5, color: R }, { cx: 18, cy: 5, color: R },
        { cx: 7, cy: 17, color: B }, { cx: 17, cy: 17, color: B },
        { cx: 7, cy: 27, color: B }, { cx: 17, cy: 27, color: B },
      ];
    case 8:
      return [
        { cx: 7, cy: 5, color: G }, { cx: 17, cy: 5, color: G },
        { cx: 7, cy: 12, color: G }, { cx: 17, cy: 12, color: G },
        { cx: 7, cy: 20, color: G }, { cx: 17, cy: 20, color: G },
        { cx: 7, cy: 27, color: G }, { cx: 17, cy: 27, color: G },
      ];
    case 9:
      return [
        { cx: 5, cy: 6, color: R }, { cx: 12, cy: 6, color: R }, { cx: 19, cy: 6, color: R },
        { cx: 5, cy: 16, color: G }, { cx: 12, cy: 16, color: G }, { cx: 19, cy: 16, color: G },
        { cx: 5, cy: 26, color: B }, { cx: 12, cy: 26, color: B }, { cx: 19, cy: 26, color: B },
      ];
    default:
      return [];
  }
}

const DotFace: React.FC<{ value: number }> = ({ value }) => {
  const dots = dotPositions(value);
  const r = value <= 3 ? 3.5 : value <= 5 ? 3 : value <= 7 ? 2.6 : 2.3;
  return (
    <svg viewBox="0 0 24 32" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      {dots.map((d, i) => (
        <g key={i}>
          <circle cx={d.cx} cy={d.cy} r={r} fill={d.color} />
          <circle cx={d.cx - r * 0.35} cy={d.cy - r * 0.35} r={r * 0.35} fill="#fff" opacity="0.55" />
        </g>
      ))}
    </svg>
  );
};

// 竹子（一節）
const BambooStick: React.FC<{ x: number; y: number; h?: number; color?: string }> = ({ x, y, h = 8, color = COLOR_GREEN }) => (
  <g transform={`translate(${x},${y})`}>
    {/* 竹節主幹 */}
    <rect x={-1.4} y={1.2} width={2.8} height={h - 2.4} fill={color} rx={1} />
    {/* 兩端竹節 */}
    <ellipse cx={0} cy={1.2} rx={2} ry={1.1} fill={color} />
    <ellipse cx={0} cy={h - 1.2} rx={2} ry={1.1} fill={color} />
    {/* 高光 */}
    <rect x={-0.4} y={2} width={0.6} height={h - 4} fill="#fff" opacity="0.45" />
  </g>
);

// 條子位置
function bamPositions(value: number): Array<{ x: number; y: number; h?: number; color?: string }> {
  const G = COLOR_GREEN, R = COLOR_RED, B = COLOR_BLUE;
  switch (value) {
    case 2: return [{ x: 9, y: 8, h: 16, color: G }, { x: 15, y: 8, h: 16, color: G }];
    case 3: return [
      { x: 12, y: 4, h: 10, color: R },
      { x: 8, y: 18, h: 10, color: G },
      { x: 16, y: 18, h: 10, color: G },
    ];
    case 4: return [
      { x: 8, y: 5, h: 10, color: G }, { x: 16, y: 5, h: 10, color: G },
      { x: 8, y: 19, h: 10, color: G }, { x: 16, y: 19, h: 10, color: G },
    ];
    case 5: return [
      { x: 7, y: 4, h: 8, color: G }, { x: 17, y: 4, h: 8, color: G },
      { x: 12, y: 12, h: 8, color: R },
      { x: 7, y: 20, h: 8, color: G }, { x: 17, y: 20, h: 8, color: G },
    ];
    case 6: return [
      { x: 6, y: 4, h: 9, color: B }, { x: 12, y: 4, h: 9, color: B }, { x: 18, y: 4, h: 9, color: B },
      { x: 6, y: 19, h: 9, color: G }, { x: 12, y: 19, h: 9, color: G }, { x: 18, y: 19, h: 9, color: G },
    ];
    case 7: return [
      { x: 12, y: 2, h: 7, color: R },
      { x: 5, y: 11, h: 7, color: G }, { x: 12, y: 11, h: 7, color: G }, { x: 19, y: 11, h: 7, color: G },
      { x: 5, y: 21, h: 7, color: G }, { x: 12, y: 21, h: 7, color: G }, { x: 19, y: 21, h: 7, color: G },
    ];
    case 8: return [
      { x: 6, y: 2, h: 7, color: G }, { x: 12, y: 2, h: 7, color: G }, { x: 18, y: 2, h: 7, color: G },
      { x: 6, y: 11, h: 7, color: G }, { x: 18, y: 11, h: 7, color: G },
      { x: 6, y: 21, h: 7, color: G }, { x: 12, y: 21, h: 7, color: G }, { x: 18, y: 21, h: 7, color: G },
    ];
    case 9: return [
      { x: 5, y: 2, h: 7, color: R }, { x: 12, y: 2, h: 7, color: R }, { x: 19, y: 2, h: 7, color: R },
      { x: 5, y: 12, h: 7, color: G }, { x: 12, y: 12, h: 7, color: G }, { x: 19, y: 12, h: 7, color: G },
      { x: 5, y: 22, h: 7, color: B }, { x: 12, y: 22, h: 7, color: B }, { x: 19, y: 22, h: 7, color: B },
    ];
    default: return [];
  }
}

const BamFace: React.FC<{ value: number }> = ({ value }) => {
  // 一條：傳統為「雀鳥」圖樣
  if (value === 1) {
    return (
      <svg viewBox="0 0 24 32" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
        {/* 鳥身 */}
        <ellipse cx="12" cy="17" rx="6" ry="5" fill={COLOR_RED} />
        <ellipse cx="12" cy="17" rx="6" ry="5" fill="none" stroke="#7a1f1f" strokeWidth="0.5" />
        {/* 頭 */}
        <circle cx="16" cy="11" r="3.2" fill={COLOR_RED} />
        {/* 眼 */}
        <circle cx="17" cy="10.4" r="0.6" fill="#fff" />
        {/* 喙 */}
        <polygon points="19,10.5 21,11 19,11.6" fill="#e9a23b" />
        {/* 尾羽 */}
        <polygon points="6,16 2,12 4,18" fill={COLOR_GREEN} />
        <polygon points="6,18 2,20 4,22" fill={COLOR_GREEN} />
        {/* 腳 */}
        <line x1="10" y1="22" x2="9" y2="26" stroke="#6a3712" strokeWidth="0.8" />
        <line x1="14" y1="22" x2="15" y2="26" stroke="#6a3712" strokeWidth="0.8" />
        {/* 翅紋 */}
        <path d="M 9,15 Q 12,13 15,15" stroke="#7a1f1f" strokeWidth="0.6" fill="none" />
      </svg>
    );
  }
  const positions = bamPositions(value);
  return (
    <svg viewBox="0 0 24 32" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      {positions.map((p, i) => (
        <BambooStick key={i} x={p.x} y={p.y} h={p.h} color={p.color} />
      ))}
    </svg>
  );
};

// 萬子：上方阿拉伯/小寫數字漢字，下方「萬」
const CrakFace: React.FC<{ value: number }> = ({ value }) => {
  const numerals = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  return (
    <svg viewBox="0 0 24 32" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <text
        x="12" y="13"
        fontSize="11"
        textAnchor="middle"
        fill={COLOR_DARK}
        fontFamily="'Songti SC','Noto Serif TC','Microsoft JhengHei',serif"
        fontWeight="700"
      >
        {numerals[value] ?? ''}
      </text>
      <text
        x="12" y="27"
        fontSize="11"
        textAnchor="middle"
        fill={COLOR_RED}
        fontFamily="'Songti SC','Noto Serif TC','Microsoft JhengHei',serif"
        fontWeight="700"
      >
        萬
      </text>
    </svg>
  );
};

// 風牌：東南西北 — 大字置中
const WindFace: React.FC<{ direction: string }> = ({ direction }) => {
  const map: Record<string, string> = { east: '東', south: '南', west: '西', north: '北' };
  return (
    <svg viewBox="0 0 24 32" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <text
        x="12" y="22"
        fontSize="20"
        textAnchor="middle"
        fill={COLOR_DARK}
        fontFamily="'Songti SC','Noto Serif TC','Microsoft JhengHei',serif"
        fontWeight="700"
      >
        {map[direction] ?? ''}
      </text>
    </svg>
  );
};

// 三元牌：中、發、白
const DragonFace: React.FC<{ color: string }> = ({ color }) => {
  if (color === 'red') {
    return (
      <svg viewBox="0 0 24 32" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
        <text x="12" y="22" fontSize="20" textAnchor="middle"
          fill={COLOR_RED}
          fontFamily="'Songti SC','Noto Serif TC','Microsoft JhengHei',serif"
          fontWeight="700">中</text>
      </svg>
    );
  }
  if (color === 'green') {
    return (
      <svg viewBox="0 0 24 32" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
        <text x="12" y="22" fontSize="18" textAnchor="middle"
          fill={COLOR_GREEN}
          fontFamily="'Songti SC','Noto Serif TC','Microsoft JhengHei',serif"
          fontWeight="700">發</text>
      </svg>
    );
  }
  // 白板：藍色內框
  return (
    <svg viewBox="0 0 24 32" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <rect x="5" y="6" width="14" height="20" fill="none" stroke={COLOR_BLUE} strokeWidth="1.6" rx="1" />
      <line x1="5" y1="10" x2="19" y2="10" stroke={COLOR_BLUE} strokeWidth="0.8" opacity="0.5" />
      <line x1="5" y1="22" x2="19" y2="22" stroke={COLOR_BLUE} strokeWidth="0.8" opacity="0.5" />
    </svg>
  );
};

interface Props {
  tileType: string;
}

const TileFace: React.FC<Props> = ({ tileType }) => {
  const [suit, val] = tileType.split('-');
  switch (suit) {
    case 'dot': return <DotFace value={Number(val)} />;
    case 'bam': return <BamFace value={Number(val)} />;
    case 'crak': return <CrakFace value={Number(val)} />;
    case 'wind': return <WindFace direction={val} />;
    case 'dragon': return <DragonFace color={val} />;
    default: return null;
  }
};

export default TileFace;
