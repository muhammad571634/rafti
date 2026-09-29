/**
 * Lottie slots.
 *
 * Every animated moment in the app asks for a slot by name. If the matching
 * `.json` has been dropped into this folder and wired below, `<Anim>` plays it;
 * otherwise it renders the Reanimated fallback so the screen never looks broken.
 *
 * To add one: download from lottiefiles.com, save it here under the exact file
 * name in `ANIM_FILES`, then uncomment its `require` line.
 */
export type AnimName =
  | 'levelUp'
  | 'typing'
  | 'voiceWave'
  | 'shell'
  | 'heartBurst'
  | 'calling'
  | 'giftBox'
  | 'confetti'
  | 'loveLetter';

/** Exact file names to save downloads as. */
export const ANIM_FILES: Record<AnimName, string> = {
  levelUp: 'level-up.json',
  typing: 'typing.json',
  voiceWave: 'voice-wave.json',
  shell: 'shell.json',
  heartBurst: 'heart-burst.json',
  calling: 'calling.json',
  giftBox: 'gift-box.json',
  confetti: 'confetti.json',
  loveLetter: 'love-letter.json',
};

/**
 * Metro needs static `require` calls, so each source is listed explicitly.
 * Uncomment a line once the file exists.
 */
/** Metro resolves a `.json` require to the parsed animation object. */
export type AnimSource = Record<string, unknown>;

export const ANIM_SOURCES: Partial<Record<AnimName, AnimSource>> = {
  levelUp: require('./level-up.json'),
  typing: require('./typing.json'),
  // voiceWave: require('./voice-wave.json'),
  // shell: require('./shell.json'),
  heartBurst: require('./heart-burst.json'),
  // calling: require('./calling.json'),
  giftBox: require('./gift-box.json'),
  confetti: require('./confetti.json'),
  loveLetter: require('./love-letter.json'),
};

export const hasAnim = (name: AnimName) => ANIM_SOURCES[name] != null;
