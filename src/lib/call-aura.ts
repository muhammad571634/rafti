/**
 * Pure math and colour helpers for the Live Voice Call "Suyuqli Aurora" (Liquid Ribbon) shader
 * and its non-Skia fallback. Kept React-free so unit tests verify every state cleanly.
 */

export type Rgb01 = readonly [number, number, number];

/** Canvas diameter relative to avatar diameter (leaves generous bloom room with zero clipping). */
export const CALL_AURA_SCALE = 2.4;

const FALLBACK_RGB: Rgb01 = [0.92, 0.68, 0.52];

/** Parses a `#RGB` or `#RRGGBB` colour into normalized `[r, g, b]` in `0..1`. */
export function parseHexRgb(hex?: string): Rgb01 {
  if (!hex) return FALLBACK_RGB;
  const raw = hex.trim().replace(/^#/, '');
  if (raw.length === 3) {
    const r = parseInt(raw[0] + raw[0], 16);
    const g = parseInt(raw[1] + raw[1], 16);
    const b = parseInt(raw[2] + raw[2], 16);
    if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
      return [r / 255, g / 255, b / 255];
    }
    return FALLBACK_RGB;
  }
  if (raw.length >= 6) {
    const r = parseInt(raw.slice(0, 2), 16);
    const g = parseInt(raw.slice(2, 4), 16);
    const b = parseInt(raw.slice(4, 6), 16);
    if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
      return [r / 255, g / 255, b / 255];
    }
  }
  return FALLBACK_RGB;
}

/**
 * Derives a luminous companion ribbon colour from the friend's accent so the 3 overlapping
 * Liquid Aurora ribbons shimmer with silk-like chromatic depth on obsidian photography.
 */
export function auraCompanionRgb(accentHex?: string): Rgb01 {
  const [r, g, b] = parseHexRgb(accentHex);
  // Subtle harmonic rotation + gentle pearl lift so cool accents gain violet-cyan shimmer
  // and warm accents gain rose-amber shimmer without ever washing out to white.
  const nr = Math.min(1, r * 0.58 + b * 0.36 + 0.16);
  const ng = Math.min(1, g * 0.54 + r * 0.24 + 0.18);
  const nb = Math.min(1, b * 0.62 + g * 0.34 + 0.22);
  return [nr, ng, nb];
}

export interface AuraEnergy {
  /** Outward liquid ribbon wave amplitude (`0..1`). */
  ribbonGain: number;
  /** Inward listening compression & cyan-pearl rim (`0..1`). */
  listenPull: number;
  /** Ethereal rotating pearl-aurora thinking energy (`0..1`). */
  thinkGlow: number;
}

/** Computes normalized visual energies for the 4 call states (silence, friend, user, thinking). */
export function auraStateEnergy(their: number, mine: number, thinking: boolean): AuraEnergy {
  const t = Math.max(0, Math.min(1, their));
  const m = Math.max(0, Math.min(1, mine));
  const th = thinking ? 1 : 0;
  return {
    ribbonGain: Math.min(1, 0.14 + t * 0.86 + th * 0.18),
    listenPull: m,
    thinkGlow: th,
  };
}
