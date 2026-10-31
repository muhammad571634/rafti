/**
 * How many model calls one account or one address may make, counted in this process's memory (the
 * API runs on one machine). Above it the app gets "busy" and writes its stand-in. A person texting
 * never gets near; the limits are there for a script with the URL, since accounts start anonymous.
 */
export interface ModelLimits {
  userPerMinute: number;
  userPerDay: number;
  addressPerMinute: number;
  addressPerDay: number;
}

export const MODEL_LIMITS: ModelLimits = {
  // A stream line every few seconds, or a group's two calls a message, stays well under this.
  userPerMinute: 60,
  userPerDay: 1500,
  // Higher: many people can share one mobile network's address.
  addressPerMinute: 180,
  addressPerDay: 6000,
};

/** Old windows are swept once this many keys are held, so an attacker's many keys cannot fill the memory. */
const SWEEP_AT = 50_000;

/** True while `key` has made at most `limit` hits in the running window. */
export function windowLimiter(limit: number, windowMs: number, now: () => number = Date.now) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (key: string) => {
    const t = now();
    const hit = hits.get(key);
    if (hit && hit.resetAt > t) {
      hit.count += 1;
      return hit.count <= limit;
    }
    if (hits.size >= SWEEP_AT) {
      for (const [k, h] of hits) if (h.resetAt <= t) hits.delete(k);
    }
    hits.set(key, { count: 1, resetAt: t + windowMs });
    return true;
  };
}
