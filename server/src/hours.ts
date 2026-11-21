/**
 * When people talk, by their own clock (owner, 2026-11-11: "measure the 9 PM to 2 AM peak, do not
 * guess it"). Each chat reply the server writes is counted in the hour it is where the user is, from
 * the UTC offset the app sends with every reply (`clock.utcOffsetMin`); replies with no clock are
 * counted apart. The server prints the counts once an hour (`[hours]`) and starts again, so the Fly
 * log holds one line per hour: sum them over days for the shape of the day. Nothing personal is kept,
 * only 24 counters and how many different accounts each hour saw.
 */
export class TalkHours {
  private replies = new Array<number>(24).fill(0);
  private people = Array.from({ length: 24 }, () => new Set<string>());
  private unknown = 0;

  /** One reply written at `nowMs` (server time) for someone `utcOffsetMin` minutes from UTC. */
  count(nowMs: number, utcOffsetMin: number | undefined, account?: string | null) {
    if (utcOffsetMin === undefined) {
      this.unknown += 1;
      return;
    }
    const hour = localHour(nowMs, utcOffsetMin);
    this.replies[hour] += 1;
    if (account) this.people[hour].add(account);
  }

  /** The line for the log, then a fresh start; null when nothing was counted. */
  flush(): string | null {
    const parts = this.replies.flatMap((n, h) => (n > 0 ? [`${h}:${n}/${this.people[h].size}`] : []));
    const line = parts.length || this.unknown ? `[hours] ${parts.join(' ')}${this.unknown ? ` noclock=${this.unknown}` : ''}`.replace('[hours]  ', '[hours] ') : null;
    this.replies.fill(0);
    this.people.forEach((s) => s.clear());
    this.unknown = 0;
    return line;
  }
}

/** The hour (0-23) on a wall clock `utcOffsetMin` minutes from UTC at the instant `nowMs`. */
export function localHour(nowMs: number, utcOffsetMin: number): number {
  const minutes = Math.floor(nowMs / 60_000) + utcOffsetMin;
  return ((Math.floor(minutes / 60) % 24) + 24) % 24;
}
