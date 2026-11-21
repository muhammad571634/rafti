/**
 * Loudness on a call, as 0-1 levels the avatar's rings follow (brief 2026-11-15 Step 4): the user's
 * mic meter, their voice's samples, or, while they speak in captions only, the rhythm of the words.
 * Also the echo gate that lets the user talk over their voice without the speaker cutting itself off.
 */

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/** A recorder meter reading (dBFS) as 0-1: quiet room at `floor`, close speech at `ceil`. */
export function dbToLevel(db: number | undefined, floor = -55, ceil = -15): number {
  if (typeof db !== 'number' || !Number.isFinite(db)) return 0;
  return clamp01((db - floor) / (ceil - floor));
}

/** PCM frames (-1..1) as 0-1: RMS, lifted so ordinary speech (RMS ~0.1-0.3) fills most of the range. */
export function rmsLevel(frames: readonly number[]): number {
  if (!frames.length) return 0;
  let sum = 0;
  for (const f of frames) sum += f * f;
  return clamp01(Math.sqrt(sum / frames.length) * 3);
}

/** One step of a caption's rhythm, in ms: about the length of a syllable. */
export const CAPTION_STEP_MS = 110;

/**
 * A spoken-like level per step for a line with no voice: vowels open, consonants half, spaces and
 * punctuation close; a full stop holds a longer pause. Works for any script: letters that are not
 * Latin vowels count as syllable bodies, so the rings still move for Japanese or Arabic text.
 */
export function captionLevels(text: string): number[] {
  const out: number[] = [];
  for (const ch of text) {
    if (/[.!?…。！？]/.test(ch)) out.push(0, 0, 0);
    else if (/[\s,;:、，—-]/.test(ch)) out.push(0.05);
    else if (/[aeiouyаеёиоуыэюяáéíóúàèìòùäöüıəо]/i.test(ch)) out.push(0.85);
    else if (/\p{L}/u.test(ch)) out.push(/[a-zа-я]/i.test(ch) ? 0.45 : 0.7);
  }
  // Two characters make about one syllable step: average pairs so the pulse is not too fast.
  const steps: number[] = [];
  for (let i = 0; i < out.length; i += 2) steps.push((out[i] + (out[i + 1] ?? out[i])) / 2);
  return steps;
}

/** How long the gate listens at the start of their line to learn how loud their own voice comes back. */
export const ECHO_LEARN_MS = 600;
/** How far above that echo the user must be to count as talking over them. */
export const ECHO_MARGIN_DB = 8;

/**
 * Whether a mic reading is the user, not their own voice coming back from the speaker. While their
 * voice is quiet the bar is `baseDb` (the call's voice level). When their voice starts, the gate
 * first listens for `ECHO_LEARN_MS` (nothing counts then), takes the loud end of what it heard as
 * the echo, and from then on only a reading `ECHO_MARGIN_DB` above both the echo and the base bar
 * counts: a person talking over a phone's speaker is much louder at its mic than the speaker is.
 */
export function createEchoGate(baseDb: number) {
  let theirsSince = 0;
  let heard: number[] = [];
  let echo: number | null = null;
  return {
    hear(db: number | undefined, theirVoice: boolean, now: number): boolean {
      if (typeof db !== 'number' || !Number.isFinite(db)) return false;
      if (!theirVoice) {
        theirsSince = 0;
        heard = [];
        echo = null;
        return db > baseDb;
      }
      if (!theirsSince) theirsSince = now;
      if (echo === null) {
        heard.push(db);
        if (now - theirsSince < ECHO_LEARN_MS) return false;
        const sorted = [...heard].sort((a, b) => a - b);
        echo = sorted[Math.floor((sorted.length - 1) * 0.8)];
        return false;
      }
      return db > Math.max(baseDb, echo) + ECHO_MARGIN_DB;
    },
  };
}
