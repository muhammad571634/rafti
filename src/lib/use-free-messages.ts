import { messagesLeft, showLeft, usedToday } from '@/economy/free-messages';
import { rollSubscription } from '@/economy/plans';
import { todayKey } from '@/mock';
import { useAppStore } from '@/store/use-app-store';

/** Today's free messages left (audit §6.3): a plan's fair use, or the free count. */
export function useFreeMessagesLeft(): number {
  return useAppStore((s) => messagesLeft(s.wallet.subscription, usedToday(s.daily.freeDay, s.daily.freeUsed, todayKey()), Date.now()));
}

/** The same count read at this moment (a tap handler), so a new day counts even before the store changes. */
export function freeMessagesLeftNow(): number {
  const s = useAppStore.getState();
  return messagesLeft(s.wallet.subscription, usedToday(s.daily.freeDay, s.daily.freeUsed, todayKey()), Date.now());
}

/**
 * The moment today's free messages run out (owner, 2026-11-16: after 30 messages nothing said so and
 * shells went quietly): true when the next message would be the first paid one today, the sheet has
 * not shown today, and the wallet can pay (with too few shells the paywall says it instead).
 */
export function needsFreeOutNotice(cost: number): boolean {
  const s = useAppStore.getState();
  return freeMessagesLeftNow() === 0 && s.daily.freeOutDay !== todayKey() && s.wallet.shells >= cost;
}

/** Today's free count is used and no plan covers the chat: the composer says messages now cost a shell. */
export function useFreeGone(): boolean {
  return useAppStore(
    (s) => !rollSubscription(s.wallet.subscription, Date.now()) && messagesLeft(s.wallet.subscription, usedToday(s.daily.freeDay, s.daily.freeUsed, todayKey()), Date.now()) === 0,
  );
}

/** The chat's "N left today" note: a number for the free count's last few, else null. */
export function useLeftNote(): number | null {
  return useAppStore((s) => showLeft(s.wallet.subscription, usedToday(s.daily.freeDay, s.daily.freeUsed, todayKey()), Date.now()));
}
