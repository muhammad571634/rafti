import { useState } from 'react';

import { canAddCharacter, isNewCharacter } from '@/economy/early-access';
import { hasPro } from '@/economy/plans';
import { useAppStore } from '@/store/use-app-store';
import type { Character } from '@/types';

import { ProPaywallSheet } from './pro-paywall-sheet';

/**
 * "New characters first" for any screen that adds friends (Find, world pages, the profile):
 * the card badge, an add that opens the Pro sheet while the character is Pro-only, and that
 * sheet. Starting the trial adds the friend at once (`onAdded` gets the chat).
 */
export function useEarlyAccess(onAdded?: (conversationId: string) => void) {
  const pro = useAppStore((s) => hasPro(s.wallet.subscription, Date.now()));
  const addFriend = useAppStore((s) => s.addFriend);
  // The character stays set while the sheet closes, so its content does not blank out.
  const [target, setTarget] = useState<Character | null>(null);
  const [open, setOpen] = useState(false);
  const now = Date.now();

  const fresh = (character: Character) =>
    isNewCharacter(character, now) ? (pro ? ('new' as const) : ('proFirst' as const)) : undefined;

  const locked = (character: Character) => !canAddCharacter(character, pro, now);

  /** Adds the friend, or opens the Pro sheet when the character is still Pro-only. */
  const add = (character: Character) => {
    if (locked(character)) {
      setTarget(character);
      setOpen(true);
      return;
    }
    const conversationId = addFriend(character.id);
    onAdded?.(conversationId);
  };

  const sheet = (
    <ProPaywallSheet
      visible={open}
      kind="newCharacter"
      character={target ?? undefined}
      onClose={() => setOpen(false)}
      onStarted={() => {
        setOpen(false);
        if (!target) return;
        const conversationId = addFriend(target.id);
        onAdded?.(conversationId);
      }}
    />
  );

  return { fresh, locked, add, sheet };
}
