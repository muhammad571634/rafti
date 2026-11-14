/**
 * Brand art. The Sigmazam mascot pieces come from `scripts/build-sigmazam-brand.py`
 * (sources in docs/branding); tiles and clay icons from `scripts/build-brand-art.py`.
 * Metro needs static requires, so every file is listed.
 */
export const BRAND = {
  /** The mascot winking, as a die-cut sticker (transparent). Default avatar, call sticker. */
  sticker: require('./sigmazam-sticker.png'),
  /** The mascot peering through a magnifying glass (transparent). Empty lists. */
  empty: require('./sigmazam-empty.png'),
  /** The mascot jumping to catch a glowing shell, on cream. Daily reward. */
  reward: require('./sigmazam-reward.jpg'),
  /** The mascot bursting out of hearts with a little crown, on mint. Level-up. */
  levelUp: require('./sigmazam-levelup.jpg'),
  /** The mascot asleep in a crescent moon, night sky. Bedtime. */
  bedtime: require('./sigmazam-bedtime.jpg'),
  /** The mascot writing at a desk, 3:4, top third left empty for the title. My diary cover. */
  diaryCover: require('./sigmazam-diary.jpg'),
  /** The mascot's head and paws, peeking over an edge; the body is cut flat (transparent). Check-in sheet. */
  peek: require('./sigmazam-peek.png'),
  /** Sigmazam wordmark with the mascot over the G (transparent). Today header. */
  logo: require('./sigmazam-logo.png'),
  /** The Sigmazam mascot peeking over the G (transparent). The brand mark, onboarding. */
  mark: require('./sigmazam-mark.png'),
  /** The mascot jumping and waving (transparent, cut by scripts/cut-mascot-poses.py). Intro, onboarding hello. */
  hop: require('./sigmazam-hop.png'),
  /** The mascot winking with a peace sign, no sticker edge (transparent). Intro. */
  wink: require('./sigmazam-wink.png'),
  /** The mascot hugging a heart, eyes closed (transparent). Onboarding gift. */
  love: require('./sigmazam-love.png'),
} as const;

export type BrandArtName = keyof typeof BRAND;

/**
 * The names of the old 3D clay art, kept as ids: dates, radio tracks and frame stickers still name
 * their art by them (each screen draws its own SF Symbol for the id). The PNGs are retired (owner,
 * 2026-11-08: "we don't need them at all any more").
 */
export const ART_IDS = ['voice', 'photo', 'secretNote', 'quiz', 'truthOrDare', 'date', 'calls', 'diary', 'ball', 'planner', 'play', 'playStack', 'gift', 'store', 'contacts', 'radio', 'board', 'bedtime', 'camera', 'calendar', 'search', 'compass', 'music', 'lock', 'umbrella', 'fish', 'fireworks', 'headphones', 'nightSky', 'cake', 'house', 'sun', 'plane', 'invite', 'sparkles', 'levelUp', 'fireplace', 'wave', 'film', 'wand', 'polaroids', 'jar', 'alarm', 'palette', 'trophy', 'hourglass', 'pencil', 'bubbles'] as const;

export type ArtId = (typeof ART_IDS)[number];

/** Rafti reaction stickers, in menu order. Cut from one sheet by the build script. */
export const REACTION_STICKERS = {
  love: require('./reaction-love.png'),
  laugh: require('./reaction-laugh.png'),
  wow: require('./reaction-wow.png'),
  sad: require('./reaction-sad.png'),
  hyped: require('./reaction-hyped.png'),
  thumbs: require('./reaction-thumbs.png'),
} as const;

export type ReactionName = keyof typeof REACTION_STICKERS;

/** Intrinsic width / height, so art can be sized from one dimension. */
export const BRAND_ASPECT: Record<BrandArtName, number> = {
  sticker: 638 / 640,
  empty: 424 / 720,
  reward: 1,
  levelUp: 800 / 533,
  bedtime: 1,
  diaryCover: 675 / 900,
  peek: 720 / 540,
  logo: 1670 / 356,
  mark: 681 / 806,
  hop: 577 / 640,
  wink: 639 / 640,
  love: 443 / 640,
};
