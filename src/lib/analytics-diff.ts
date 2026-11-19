import type { EventName, PropsOf } from './analytics-events';

/**
 * The events a change of the app's state stands for (product analytics, 0z282). The store is not
 * sprinkled with `track` calls: `use-analytics` hands each change here, and what happened is read
 * from the difference: a new line of yours (message sent), a line of yours marked failed (their
 * reply did not come), a thumbs on their line, a call in the log, a level, a new character of
 * your own, onboarding done, a plan, a check-in, another version of their reply asked for.
 *
 * Pure and cheap: only lists whose reference changed are looked at, and only their newest lines.
 */

interface WatchedMessage {
  id: string;
  author: 'me' | 'them';
  kind: string;
  failed?: boolean;
  rating?: 'up' | 'down';
  card?: string;
  next?: string;
  createdAt?: string;
}

/** The part of the store this reads (structural, so the store's own type fits). */
export interface WatchedState {
  messages: Record<string, readonly WatchedMessage[] | undefined>;
  conversations: readonly { id: string; characterId: string }[];
  groups: readonly { id: string }[];
  calls: readonly { id: string; characterId: string; durationSec: number; direction: string; missed: boolean }[];
  characters: readonly { id: string; isOfficial: boolean }[];
  levelUp: { characterId: string; level: number } | null;
  user: { onboardedAt?: string };
  wallet: { subscription?: { plan: string; status: string } };
  /** `lastLoginDay` moves when the day's check-in is collected. */
  daily: { checkInDay: number; lastLoginDay?: string };
  replyVersions: Record<string, { afterId: string; versions: readonly unknown[]; index: number } | undefined>;
}

export type Tracked = { [N in EventName]: { name: N; props?: PropsOf<N> } }[EventName];

/** How far back in a changed chat to look for what is new: more than any one change adds. */
const TAIL = 30;
/** More new lines of yours than this in one change is a restore or an import, not typing. */
const BURST = 3;
/** A line older than this that appears is coming back (a branch switched in, a restore), not new. */
const BACK_MS = 2 * 60_000;

export function eventsFromChange(prev: WatchedState, next: WatchedState, now = Date.now()): Tracked[] {
  const out: Tracked[] = [];

  if (prev.messages !== next.messages) {
    const characterOf = new Map(next.conversations.map((c) => [c.id, c.characterId]));
    const groupIds = new Set(next.groups.map((g) => g.id));
    for (const [chatId, list] of Object.entries(next.messages)) {
      const before = prev.messages[chatId];
      if (!list || list === before) continue;
      const group = groupIds.has(chatId);
      const character = group ? undefined : characterOf.get(chatId);
      const old = new Map((before ?? []).slice(-TAIL * 2).map((m) => [m.id, m]));
      // A chat appearing whole (a restore, the demo data) is not a burst of new messages.
      if (!before && list.length > BURST) continue;
      const sent: Tracked[] = [];
      for (const m of list.slice(-TAIL)) {
        const was = old.get(m.id);
        if (!was && m.createdAt && now - Date.parse(m.createdAt) > BACK_MS) continue;
        if (!was) {
          if (m.author === 'me' && !m.card && m.kind !== 'system' && m.kind !== 'call') {
            sent.push({ name: 'message_sent', props: { kind: m.kind, group, ...(character ? { character } : {}) } });
          }
          if (m.author === 'them' && m.next && before) out.push({ name: 'next_shown', props: { kind: m.next, ...(character ? { character } : {}) } });
          continue;
        }
        if (m.author === 'me' && m.failed && !was.failed) out.push({ name: 'reply_failed', props: character ? { character } : {} });
        if (m.author === 'them' && m.rating && m.rating !== was.rating) out.push({ name: 'reply_rated', props: { rating: m.rating, ...(character ? { character } : {}) } });
      }
      // Pages read back from the server land many lines at once into a chat that already had some.
      if (sent.length <= BURST) out.push(...sent);
      // Writing on after browsing their reply's versions: the one on screen is the one kept, the
      // signal of which of the model's lines land (docs/polybuzz-core.md §5.3).
      const held = next.replyVersions[chatId];
      const filled = held?.versions.filter((v) => (v as readonly unknown[]).length > 0).length ?? 0;
      const lastMine = (before ?? []).findLast((m) => m.author === 'me' && m.kind !== 'system' && !m.card);
      if (sent.length === 1 && held && filled > 1 && lastMine?.id === held.afterId) {
        out.push({ name: 'version_kept', props: { index: held.index + 1, of: filled, ...(character ? { character } : {}) } });
      }
    }
  }

  if (prev.replyVersions !== next.replyVersions) {
    const characterOf = new Map(next.conversations.map((c) => [c.id, c.characterId]));
    for (const [chatId, held] of Object.entries(next.replyVersions)) {
      const was = prev.replyVersions[chatId];
      if (!held || held === was) continue;
      const grew = was?.afterId === held.afterId ? held.versions.length > was.versions.length : held.versions.length > 1;
      const character = characterOf.get(chatId);
      if (grew) out.push({ name: 'regenerate', props: character ? { character } : {} });
    }
  }

  if (prev.calls !== next.calls) {
    const seen = new Set(prev.calls.map((c) => c.id));
    for (const c of next.calls) {
      if (seen.has(c.id)) continue;
      out.push({ name: 'call', props: { character: c.characterId, seconds: Math.round(c.durationSec), direction: c.direction, missed: c.missed } });
    }
  }

  if (prev.characters !== next.characters && next.characters.length > prev.characters.length) {
    const seen = new Set(prev.characters.map((c) => c.id));
    for (const c of next.characters) if (!c.isOfficial && !seen.has(c.id)) out.push({ name: 'character_created' });
  }

  if (next.levelUp && next.levelUp !== prev.levelUp) {
    out.push({ name: 'level_up', props: { character: next.levelUp.characterId, level: next.levelUp.level } });
  }

  if (next.user.onboardedAt && !prev.user.onboardedAt) {
    const first = next.conversations[0]?.characterId;
    out.push({ name: 'onboarding_done', props: first ? { character: first } : {} });
  }

  const sub = next.wallet.subscription;
  const had = prev.wallet.subscription;
  if (sub && (!had || had.plan !== sub.plan || (had.status === 'trial' && sub.status === 'active'))) {
    out.push({ name: 'plan_start', props: { plan: sub.plan, trial: sub.status === 'trial' } });
  }

  if (next.daily.lastLoginDay && next.daily.lastLoginDay !== prev.daily.lastLoginDay) {
    out.push({ name: 'check_in', props: { day: next.daily.checkInDay } });
  }

  return out;
}
