/** A short unique id for store rows: a prefix, the time and a few random characters. */
export const uid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
