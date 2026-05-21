// localStorage helpers — no backend, everything stays in the user's browser.

const KEYS = {
  streak: 'xge:streak',
  savedIdeas: 'xge:saved',
  lastSeed: 'xge:lastSeed',
  settings: 'xge:settings',
  threadLog: 'xge:threads',
  donePosts: 'xge:donePosts',
};

export interface StreakData {
  current: number;
  best: number;
  lastDate: string; // YYYY-MM-DD
  totalDays: number;
}

export interface SavedIdea {
  id: string;
  text: string;
  category: string;
  savedAt: number;
  used: boolean;
}

export interface Settings {
  goalFollowers: number;
  currentFollowers: number;
  goalDate: string;
  dailyPosts: number;
}

// IST = UTC+5:30. Shift "now" by +5:30, then take the YYYY-MM-DD in UTC —
// the result is today's date as seen in India, so the day rolls over at IST midnight.
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
export const istTodayStr = (): string =>
  new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);
const todayStr = istTodayStr;

const istYesterdayStr = (): string =>
  new Date(Date.now() + IST_OFFSET_MS - 86400000).toISOString().slice(0, 10);

const isBrowser = () => typeof window !== 'undefined';

export const storage = {
  getStreak(): StreakData {
    if (!isBrowser()) return { current: 0, best: 0, lastDate: '', totalDays: 0 };
    const raw = localStorage.getItem(KEYS.streak);
    if (!raw) return { current: 0, best: 0, lastDate: '', totalDays: 0 };
    try { return JSON.parse(raw); } catch { return { current: 0, best: 0, lastDate: '', totalDays: 0 }; }
  },

  markToday(): StreakData {
    const s = storage.getStreak();
    const today = todayStr();
    if (s.lastDate === today) return s;

    const yesterday = istYesterdayStr();
    const newCurrent = s.lastDate === yesterday ? s.current + 1 : 1;
    const next: StreakData = {
      current: newCurrent,
      best: Math.max(s.best, newCurrent),
      lastDate: today,
      totalDays: s.totalDays + 1,
    };
    localStorage.setItem(KEYS.streak, JSON.stringify(next));
    return next;
  },

  getSaved(): SavedIdea[] {
    if (!isBrowser()) return [];
    const raw = localStorage.getItem(KEYS.savedIdeas);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  },

  saveIdea(idea: Omit<SavedIdea, 'id' | 'savedAt' | 'used'>) {
    const list = storage.getSaved();
    list.unshift({
      ...idea,
      id: Math.random().toString(36).slice(2),
      savedAt: Date.now(),
      used: false,
    });
    localStorage.setItem(KEYS.savedIdeas, JSON.stringify(list.slice(0, 100)));
  },

  toggleUsed(id: string) {
    const list = storage.getSaved().map(i => i.id === id ? { ...i, used: !i.used } : i);
    localStorage.setItem(KEYS.savedIdeas, JSON.stringify(list));
  },

  deleteSaved(id: string) {
    const list = storage.getSaved().filter(i => i.id !== id);
    localStorage.setItem(KEYS.savedIdeas, JSON.stringify(list));
  },

  getSettings(): Settings {
    if (!isBrowser()) return defaultSettings();
    const raw = localStorage.getItem(KEYS.settings);
    if (!raw) return defaultSettings();
    try { return { ...defaultSettings(), ...JSON.parse(raw) }; } catch { return defaultSettings(); }
  },

  setSettings(s: Partial<Settings>) {
    const merged = { ...storage.getSettings(), ...s };
    localStorage.setItem(KEYS.settings, JSON.stringify(merged));
    return merged;
  },

  // Seed based on date so daily ideas feel consistent on the same day
  getDailySeed(): number {
    const today = todayStr();
    return today.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  },

  // Thread log
  getThreadDates(): string[] {
    if (!isBrowser()) return [];
    const raw = localStorage.getItem(KEYS.threadLog);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  },

  logThread() {
    const list = storage.getThreadDates();
    const today = todayStr();
    if (!list.includes(today)) {
      list.unshift(today);
      localStorage.setItem(KEYS.threadLog, JSON.stringify(list.slice(0, 52)));
    }
  },

  // Per-day post completion. Stores { 'YYYY-MM-DD': [angle1, angle2, ...] }
  getDonePostsMap(): Record<string, string[]> {
    if (!isBrowser()) return {};
    const raw = localStorage.getItem(KEYS.donePosts);
    if (!raw) return {};
    try { return JSON.parse(raw); } catch { return {}; }
  },

  getDonePostsForToday(): string[] {
    const map = storage.getDonePostsMap();
    return map[todayStr()] ?? [];
  },

  togglePostDone(key: string): string[] {
    const map = storage.getDonePostsMap();
    const today = todayStr();
    const cur = map[today] ?? [];
    const next = cur.includes(key) ? cur.filter(k => k !== key) : [...cur, key];

    // Prune entries older than 7 days (cutoff in IST)
    const cutoff = new Date(Date.now() + IST_OFFSET_MS - 7 * 86400000).toISOString().slice(0, 10);
    const pruned: Record<string, string[]> = { [today]: next };
    for (const [d, keys] of Object.entries(map)) {
      if (d >= cutoff && d !== today && keys.length > 0) pruned[d] = keys;
    }
    localStorage.setItem(KEYS.donePosts, JSON.stringify(pruned));
    return next;
  },
};

function defaultSettings(): Settings {
  const endOfYear = new Date(new Date().getFullYear(), 11, 31).toISOString().slice(0, 10);
  return {
    goalFollowers: 10000,
    currentFollowers: 89,
    goalDate: endOfYear,
    dailyPosts: 4,
  };
}

// Simple seedable pseudo-random for deterministic daily ideas
export function seededShuffle<T>(arr: T[], seed: number): T[] {
  const copy = [...arr];
  let s = seed;
  for (let i = copy.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
