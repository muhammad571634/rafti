/**
 * Live scenes: a few seconds of silent, seamlessly looping video made from a character's
 * wide scene (`assets/heroes`), so the Today card feels alive (blinks, breath, wind).
 * Made with Higgsfield image-to-video (first frame = last frame, so the loop has no seam),
 * then trimmed and compressed with ffmpeg. Characters without a clip keep the still scene.
 */
export const LIVE_SCENES: Record<string, number> = {};
