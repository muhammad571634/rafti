/**
 * Bundled 3D icons — Microsoft Fluent Emoji (MIT), github.com/microsoft/fluentui-emoji,
 * except `shell` (the currency), which scripts/build-brand-art.py cuts from Popo art.
 * Metro needs static requires, so every file is listed.
 */
export const ICONS = {
  'bedtime': require('./bedtime.png'),
  'board': require('./board.png'),
  'calendar': require('./calendar.png'),
  'call': require('./call.png'),
  'contacts': require('./contacts.png'),
  'crown': require('./crown.png'),
  'dating': require('./dating.png'),
  'diary': require('./diary.png'),
  'ferris': require('./ferris.png'),
  'film': require('./film.png'),
  'gift': require('./gift.png'),
  'growing-heart': require('./growing-heart.png'),
  'party': require('./party.png'),
  'photo-booth': require('./photo-booth.png'),
  'rabbit': require('./rabbit.png'),
  'radio': require('./radio.png'),
  'secret-note': require('./secret-note.png'),
  'shell': require('./shell.png'),
  'sparkles': require('./sparkles.png'),
  'sun': require('./sun.png'),
} as const;

export type IconName = keyof typeof ICONS;
