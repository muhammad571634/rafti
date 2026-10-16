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
} as const;

export type BrandArtName = keyof typeof BRAND;

/** Home launcher tiles; the rounded tile is part of the image. Keyed by `HomeModule.key`. */
export const TILES = {
  store: require('./tile-store.png'),
  dating: require('./tile-dating.png'),
  diary: require('./tile-diary.png'),
  photo: require('./tile-photo.png'),
  contacts: require('./tile-contacts.png'),
  radio: require('./tile-radio.png'),
  gifts: require('./tile-gifts.png'),
  calls: require('./tile-calls.png'),
  board: require('./tile-board.png'),
  bedtime: require('./tile-bedtime.png'),
} as const;

export type TileName = keyof typeof TILES;

/**
 * Soft 3D clay icons (transparent), cut from one Nano Banana sheet by the build
 * script. The app's icon style for feature entry points; see docs/icons-3d.md for
 * where each one goes next.
 */
export const CLAY_ICONS = {
  voice: require('./icon3d-voice.png'),
  photo: require('./icon3d-photo.png'),
  secretNote: require('./icon3d-secret-note.png'),
  quiz: require('./icon3d-quiz.png'),
  truthOrDare: require('./icon3d-truth-or-dare.png'),
  date: require('./icon3d-date.png'),
  calls: require('./icon3d-calls.png'),
  diary: require('./icon3d-diary.png'),
  ball: require('./icon3d-ball.png'),
  planner: require('./icon3d-planner.png'),
  play: require('./icon3d-play.png'),
  playStack: require('./icon3d-play-stack.png'),
  gift: require('./icon3d-gift.png'),
  store: require('./icon3d-store.png'),
  contacts: require('./icon3d-contacts.png'),
  radio: require('./icon3d-radio.png'),
  board: require('./icon3d-board.png'),
  bedtime: require('./icon3d-bedtime.png'),
  camera: require('./icon3d-camera.png'),
  calendar: require('./icon3d-calendar.png'),
  search: require('./icon3d-search.png'),
  compass: require('./icon3d-compass.png'),
  music: require('./icon3d-music.png'),
  lock: require('./icon3d-lock.png'),
  umbrella: require('./icon3d-umbrella.png'),
  fish: require('./icon3d-fish.png'),
  fireworks: require('./icon3d-fireworks.png'),
  headphones: require('./icon3d-headphones.png'),
  nightSky: require('./icon3d-night-sky.png'),
  cake: require('./icon3d-cake.png'),
  house: require('./icon3d-house.png'),
  sun: require('./icon3d-sun.png'),
  plane: require('./icon3d-plane.png'),
  invite: require('./icon3d-invite.png'),
  sparkles: require('./icon3d-sparkles.png'),
  levelUp: require('./icon3d-level-up.png'),
  fireplace: require('./icon3d-fireplace.png'),
  wave: require('./icon3d-wave.png'),
  film: require('./icon3d-film.png'),
  wand: require('./icon3d-wand.png'),
  polaroids: require('./icon3d-polaroids.png'),
  jar: require('./icon3d-jar.png'),
  alarm: require('./icon3d-alarm.png'),
  palette: require('./icon3d-palette.png'),
  trophy: require('./icon3d-trophy.png'),
  hourglass: require('./icon3d-hourglass.png'),
  pencil: require('./icon3d-pencil.png'),
  bubbles: require('./icon3d-bubbles.png'),
} as const;

export type ClayIconName = keyof typeof CLAY_ICONS;

/**
 * Bottom tab bar art, keyed by route name: the clay icon for the current tab and the
 * same art in soft grey (`off`) for the others. Built by the script from
 * assets/raw/icons-3d/tab-*.png.
 */
export const TAB_ICONS = {
  index: { on: require('./icon3d-tab-home.png'), off: require('./icon3d-tab-home-off.png') },
  chat: { on: require('./icon3d-tab-chat.png'), off: require('./icon3d-tab-chat-off.png') },
  us: { on: require('./icon3d-tab-us.png'), off: require('./icon3d-tab-us-off.png') },
  find: { on: require('./icon3d-tab-find.png'), off: require('./icon3d-tab-find-off.png') },
} as const;

export type TabIconName = keyof typeof TAB_ICONS;

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
};
