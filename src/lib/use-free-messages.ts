import { messagesLeft, showLeft, usedToday } from '@/economy/free-messages';
import { todayKey } from '@/mock';
import { useAppStore } from '@/store/use-app-store';

/** Today's free messages left (audit §6.3): a plan's fair use, or the free count. */
export function useFreeMessagesLeft(): number {
  return useAppStore((s) => messagesLeft(s.wallet.subscription, usedToday(s.daily.freeDay, s.daily.freeUsed, todayKey()), Date.now()));
}

/** The chat's "N left today" note: a number for the free count's last few, else null. */
export function useLeftNote(): number | null {
  return useAppStore((s) => showLeft(s.wallet.subscription, usedToday(s.daily.freeDay, s.daily.freeUsed, todayKey()), Date.now()));
}
