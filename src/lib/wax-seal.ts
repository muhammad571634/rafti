import { dayKey } from '../mock/time';
import type { SecretNote } from '@/types';

/** Hold duration (ms) to fracture and break the wax seal directly with a thumb. */
export const WAX_HOLD_MS = 650;

/** Accelerated crack duration (ms) when triggered via one-tap "Swap notes" button. */
export const WAX_AUTO_CRACK_MS = 440;

export type WaxSealTier = 'friend' | 'pearl' | 'gold';

export interface WaxPalette {
  accent: string;
  deep: string;
  mid: string;
  rim: string;
  crack: string;
  spark: string;
}

/** Shared pure palettes (re-exported via `inkWaxSeal` in `src/theme/ink.ts`). */
export const WAX_CRACK_WARM = '#FFF2F8';

export const WAX_PEARL_PALETTE: WaxPalette = {
  accent: '#9BE7DF',
  deep: '#24585D',
  mid: '#4FA3A5',
  rim: '#DBFFF9',
  crack: '#FFFFFF',
  spark: '#B8FFF5',
};

export const WAX_GOLD_PALETTE: WaxPalette = {
  accent: '#F5C451',
  deep: '#6B470C',
  mid: '#C78E22',
  rim: '#FFE9A3',
  crack: '#FFF7D4',
  spark: '#FFD970',
};

/** Parses `YYYY-MM-DD` to a UTC midnight day number for exact calendar-day differences. */
function dayNumber(isoDay: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDay);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const ms = Date.UTC(y, mo - 1, d);
  if (!Number.isFinite(ms)) return null;
  return Math.floor(ms / 86_400_000);
}

/**
 * Counts consecutive calendar days with at least one exchanged Secret Note, anchored at today
 * (if exchanged today) or yesterday (if the streak is still alive awaiting today's seal break).
 * Returns `0` when no note was exchanged today or yesterday.
 */
export function secretNoteStreak(notes: readonly SecretNote[], now = new Date()): number {
  const exchangedDays = new Set<number>();
  for (const n of notes) {
    if (n.status !== 'exchanged') continue;
    const num = dayNumber(n.date);
    if (num !== null) exchangedDays.add(num);
  }
  if (exchangedDays.size === 0) return 0;

  const todayNum = dayNumber(dayKey(now));
  if (todayNum === null) return 0;

  let cursor = exchangedDays.has(todayNum) ? todayNum : exchangedDays.has(todayNum - 1) ? todayNum - 1 : null;
  if (cursor === null) return 0;

  let count = 0;
  while (exchangedDays.has(cursor)) {
    count += 1;
    cursor -= 1;
  }
  return count;
}

/**
 * Returns the day number that today's sealed note represents if broken now (e.g. if the user
 * already exchanged yesterday, today's waiting seal is Day 2; if already exchanged today, keeps
 * the current streak count).
 */
export function secretNoteDisplayDay(notes: readonly SecretNote[], isExchanged: boolean, now = new Date()): number {
  const streak = secretNoteStreak(notes, now);
  if (isExchanged) return Math.max(1, streak);
  const today = dayKey(now);
  const exchangedToday = notes.some((n) => n.status === 'exchanged' && n.date === today);
  return exchangedToday ? Math.max(1, streak) : streak + 1;
}

/**
 * Daily retention seal evolution:
 * - Day 1–2: signature friend wax (`'friend'`)
 * - Day 3–6: iridescent pearl wax (`'pearl'`)
 * - Day 7+ or any milestone keepsake (`depth`): molten gold foil (`'gold'`)
 */
export function waxSealTier(displayDay: number, isDepthKeepsake = false): WaxSealTier {
  if (isDepthKeepsake || displayDay >= 7) return 'gold';
  if (displayDay >= 3) return 'pearl';
  return 'friend';
}

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (v: number) => clampByte(v).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function hexToRgb255(hex: string): readonly [number, number, number] {
  const raw = hex.trim().replace(/^#/, '');
  if (raw.length >= 6) {
    const r = parseInt(raw.slice(0, 2), 16);
    const g = parseInt(raw.slice(2, 4), 16);
    const b = parseInt(raw.slice(4, 6), 16);
    if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) return [r, g, b];
  }
  return [235, 173, 132];
}

/** Derives rich 3D hand-poured wax stops for any tier and any friend accent colour. */
export function waxPaletteFor(tier: WaxSealTier, accentHex: string): WaxPalette {
  if (tier === 'gold') return WAX_GOLD_PALETTE;
  if (tier === 'pearl') return WAX_PEARL_PALETTE;

  const [r, g, b] = hexToRgb255(accentHex);
  const deep = rgbToHex(r * 0.42, g * 0.32, b * 0.38);
  const mid = rgbToHex(r * 0.78, g * 0.66, b * 0.72);
  const rim = rgbToHex(r + (255 - r) * 0.46, g + (255 - g) * 0.44, b + (255 - b) * 0.46);
  return {
    accent: accentHex,
    deep,
    mid,
    rim,
    crack: WAX_CRACK_WARM,
    spark: rim,
  };
}

/** Generates a deterministic organic hand-poured melted wax SVG closed path centred at `(cx, cy)`. */
export function waxOutlinePath(cx: number, cy: number, radius: number, segments = 64): string {
  let d = '';
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const r =
      radius +
      Math.sin(a * 3 + 0.55) * (radius * 0.052) +
      Math.cos(a * 5 - 1.1) * (radius * 0.034) +
      Math.sin(a * 7 + 2.0) * (radius * 0.018);
    const x = (cx + Math.cos(a) * r).toFixed(2);
    const y = (cy + Math.sin(a) * r).toFixed(2);
    d += i === 0 ? `M${x},${y}` : ` L${x},${y}`;
  }
  return `${d} Z`;
}

export interface CrackBranch {
  /** SVG path in a 120×120 seal coordinate space (centre at 60, 60). */
  d: string;
  /** Approximate arc length for `strokeDasharray` / `strokeDashoffset` reveal. */
  length: number;
  /** Hold threshold (`0..1`) at which this fissure begins splitting. */
  startAt: number;
}

/** Five branching stress fissures radiating from the centre of the 120×120 wax seal. */
export const WAX_CRACK_BRANCHES: readonly CrackBranch[] = [
  { d: 'M60,59 L47,47 L33,39 L19,35', length: 54, startAt: 0.08 },
  { d: 'M60,59 L74,69 L88,79 L101,87', length: 54, startAt: 0.14 },
  { d: 'M60,59 L49,74 L41,94', length: 42, startAt: 0.28 },
  { d: 'M60,59 L76,48 L91,37', length: 40, startAt: 0.42 },
  { d: 'M47,47 L54,30', length: 20, startAt: 0.56 },
];

export interface WaxShardSpec {
  kind: 'halfLeft' | 'halfRight' | 'chunk' | 'spark';
  dx: number;
  dy: number;
  rotDeg: number;
  size: number;
}

/** Deterministic shatter trajectories for the 2 broken wax halves, 4 wax crumbs, and 6 sparks. */
export const WAX_SHARDS: readonly WaxShardSpec[] = [
  { kind: 'halfLeft', dx: -64, dy: 28, rotDeg: -38, size: 32 },
  { kind: 'halfRight', dx: 66, dy: 32, rotDeg: 42, size: 32 },
  { kind: 'chunk', dx: -52, dy: -34, rotDeg: -110, size: 8 },
  { kind: 'chunk', dx: 48, dy: -38, rotDeg: 95, size: 7 },
  { kind: 'chunk', dx: -36, dy: 52, rotDeg: -75, size: 6 },
  { kind: 'chunk', dx: 42, dy: 48, rotDeg: 120, size: 7 },
  { kind: 'spark', dx: -78, dy: -16, rotDeg: 0, size: 4 },
  { kind: 'spark', dx: 76, dy: -22, rotDeg: 0, size: 4.5 },
  { kind: 'spark', dx: -24, dy: -66, rotDeg: 0, size: 3.5 },
  { kind: 'spark', dx: 28, dy: -62, rotDeg: 0, size: 4 },
  { kind: 'spark', dx: -68, dy: 42, rotDeg: 0, size: 3.5 },
  { kind: 'spark', dx: 68, dy: 40, rotDeg: 0, size: 3.5 },
];
