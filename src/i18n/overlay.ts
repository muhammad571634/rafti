export const idOf = (x: unknown) =>
  x && typeof x === 'object' && !Array.isArray(x)
    ? ((x as { id?: unknown }).id ?? (x as { key?: unknown }).key)
    : undefined;

/** The English `en` with every translated string of `tr` laid over it; anything missing or malformed keeps the English. */
export function overlay<T>(en: T, tr: unknown): T {
  if (tr == null) return en;
  if (typeof en === 'string') return (typeof tr === 'string' && tr.trim() ? tr : en) as T;
  if (Array.isArray(en)) {
    if (en.length && en.every((x) => typeof idOf(x) === 'string')) {
      if (typeof tr !== 'object' || Array.isArray(tr)) return en;
      return en.map((x) => overlay(x, (tr as Record<string, unknown>)[idOf(x) as string])) as T;
    }
    if (!Array.isArray(tr) || tr.length !== en.length) return en;
    return en.map((x, i) => overlay(x, tr[i])) as T;
  }
  if (en && typeof en === 'object') {
    if (typeof tr !== 'object' || Array.isArray(tr)) return en;
    const out: Record<string, unknown> = { ...(en as Record<string, unknown>) };
    for (const k of Object.keys(tr)) {
      if (k === 'id' || k === 'key') continue;
      if (k in out) out[k] = overlay(out[k], (tr as Record<string, unknown>)[k]);
    }
    return out as T;
  }
  return en;
}
