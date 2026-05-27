// 每日挑戰：以日期作為 seed，每日唯一牌局
// 完成紀錄存於 localStorage，避免反覆刷取獎勵

export interface DailyRecord {
  date: string;        // YYYY-MM-DD
  completed: boolean;
  score: number;
  timeSec: number;
}

const STORAGE_KEY = 'mahjong-solitaire:daily:v1';

export function todayDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 將日期字串轉成穩定 seed
export function dailySeedFromDate(dateStr: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < dateStr.length; i++) {
    h ^= dateStr.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return Math.abs(h | 0);
}

export function todayDailySeed(): number {
  return dailySeedFromDate(todayDateStr());
}

export function loadDailyHistory(): Record<string, DailyRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch {
    return {};
  }
}

export function saveDailyRecord(rec: DailyRecord): void {
  try {
    const history = loadDailyHistory();
    history[rec.date] = rec;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // ignore
  }
}

export function isDailyDoneToday(): boolean {
  const history = loadDailyHistory();
  const today = todayDateStr();
  return !!history[today]?.completed;
}

export function todayRecord(): DailyRecord | null {
  const history = loadDailyHistory();
  return history[todayDateStr()] ?? null;
}
