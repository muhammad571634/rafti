import { apiBase, serverReports } from '@/ai/server';
import { withAccount } from '@/ai/account';
import { REPORT_LIMITS } from '@/ai/session-types';
import type { Getter, Setter } from './slice-types';
import { CHECK_IN_WAIT_MS } from './wallet';

/**
 * Reports go to the server for a person to review (road-to-launch item 8). One that could not go
 * (offline, no account yet) waits on the phone and goes with the next report or on the next open.
 */
let sendingReports = false;
/** A lone high surrogate at the end: half an emoji, which the database would refuse. */
const HALF_EMOJI = /[\uD800-\uDBFF]$/;

export function sendReports(set: Setter, get: Getter) {
  const unsent = get().reports.filter((r) => !r.sent);
  if (sendingReports || !unsent.length || !apiBase()) return;
  sendingReports = true;
  const cut = (text: string) => text.slice(0, REPORT_LIMITS.textChars).replace(HALF_EMOJI, '');
  void withAccount(async (token) => {
    const settled: string[] = [];
    for (const r of unsent) {
      const request = {
        id: r.id,
        characterId: r.characterId,
        reason: r.reason,
        text: cut(r.text ?? ''),
        context: (r.context ?? []).slice(-REPORT_LIMITS.context).map((l) => ({ ...l, text: cut(l.text) })),
      };
      // A refused report would be refused again: it stays on the phone, but is not sent again.
      if (await serverReports.send(token, request)) settled.push(r.id);
    }
    return settled;
  }, CHECK_IN_WAIT_MS)
    .catch(() => null)
    .then((settled) => {
      sendingReports = false;
      if (!settled?.length) return;
      set((s) => ({ reports: s.reports.map((r) => (settled.includes(r.id) ? { ...r, sent: true } : r)) }));
      // A report made while this batch was out goes now, not on the next open.
      if (get().reports.some((r) => !r.sent && !unsent.includes(r))) sendReports(set, get);
    });
}
