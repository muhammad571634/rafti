/**
 * Framing the tall Cast 2.0 portraits (3:4) on their faces. Each painting puts the face somewhere else
 * (Clara's at the top right, Mia's lower down), so a picture cropped from its middle cut faces off on
 * Today and in the chat (seen on the A51, 2026-11-11). Pure maths: no React Native here.
 */

/** The tall portraits are 3:4 (assets/portraits). */
export const PORTRAIT_ASPECT = 3 / 4;

/** Where a face sits in a picture: `x` 0 left to 1 right, `y` 0 top to 1 bottom. */
export interface FacePoint {
  x: number;
  y: number;
}

/** The middle of each face in its tall portrait, measured on the paintings (2026-11-11). */
export const PORTRAIT_FACES: Record<string, FacePoint> = {
  c_milo: { x: 0.79, y: 0.17 },
  c_jace: { x: 0.68, y: 0.15 },
  c_sam: { x: 0.64, y: 0.18 },
  c_roman: { x: 0.68, y: 0.19 },
  c_ethan: { x: 0.67, y: 0.17 },
  c_clara: { x: 0.78, y: 0.09 },
  c_caleb: { x: 0.74, y: 0.14 },
  c_asher: { x: 0.72, y: 0.15 },
  c_mia: { x: 0.74, y: 0.25 },
  c_lena: { x: 0.69, y: 0.2 },
  c_victor: { x: 0.71, y: 0.11 },
  c_yuna: { x: 0.81, y: 0.16 },
};

/** A portrait without a measured face: the upper middle, where a painting of one person puts it. */
const UNKNOWN: FacePoint = { x: 0.5, y: 0.2 };

export const portraitFace = (characterId: string): FacePoint => PORTRAIT_FACES[characterId] ?? UNKNOWN;

/** Where a face lands down a frame: its upper third, clear of a header and of words at the bottom. */
export const FACE_DOWN = 0.3;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * The object-position (percent of the slack, as CSS and expo-image read it) that puts `face` of a
 * cover-fit picture `imageAspect` (width / height) at (`at`, `down`) of a frame `frameAspect` wide,
 * as near as the picture allows. An axis with no slack stays in the middle.
 */
export function coverFocus(face: FacePoint, imageAspect: number, frameAspect: number, at = 0.5, down = FACE_DOWN) {
  // In frame heights: cover makes the picture at least as wide and at least as tall as the frame.
  const width = Math.max(frameAspect, imageAspect);
  const height = width / imageAspect;
  const slide = (point: number, size: number, frame: number, target: number) =>
    size - frame > 1e-6 ? clamp01((point * size - target * frame) / (size - frame)) : 0.5;
  return { left: slide(face.x, width, frameAspect, at), top: slide(face.y, height, 1, down) };
}

/**
 * How many frame widths wide to draw a portrait in a frame `frameAspect` wide so its face can reach
 * `at`: 1 when the picture is already wider than the frame (it slides instead), else only as much as
 * the face needs, never more than `most` (a bigger zoom blurs the painting).
 */
export function portraitStretch(face: FacePoint, frameAspect: number, at: number, most: number) {
  if (PORTRAIT_ASPECT >= frameAspect) return 1;
  const need = Math.max(at / Math.max(face.x, 0.01), (1 - at) / Math.max(1 - face.x, 0.01));
  return Math.min(Math.max(1, most), Math.max(1, need));
}

/** Where a picture drawn `stretch` frames wide starts, so its point `faceX` lands at `at` of a `width` frame. */
export const stretchLeft = (width: number, stretch: number, at: number, faceX = 0.5) =>
  Math.min(0, Math.max(width - width * stretch, at * width - faceX * width * stretch));
