import { useCallback, useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { isAskReach } from '@/lib/reach-ask';
import { pushPermission, requestPushPermission } from '@/notifications/sync';
import { useAppStore } from '@/store/use-app-store';
import type { Message, ReplyIdea } from '@/types';

/**
 * Small pieces of the chat room's state, out of `src/app/chat/[id].tsx` (0z359): the pin notice, the
 * "Kept in Memories" notice, and the push ask after "Yes, text me!". Behaviour unchanged.
 */

/** The short notice after a pin ("Pinned to Story"); it shows at once and goes by itself. */
export function useHud() {
  const [hud, setHud] = useState<string | null>(null);
  useEffect(() => {
    if (!hud) return;
    const timer = setTimeout(() => setHud(null), 1800);
    return () => clearTimeout(timer);
  }, [hud]);
  return [hud, setHud] as const;
}

/**
 * A memory they saved about you while this chat is open (not a pinned quote) shows as a notice for a
 * few seconds. Only that one memory is read, so a memory about anyone else does not re-render the chat.
 */
export function useMemoryNotice(characterId: string | undefined, openedAt: number) {
  const freshMemory = useAppStore(
    useShallow((s) => {
      if (!characterId) return { id: '', text: '' };
      let bestId = '';
      let bestText = '';
      let bestAt = openedAt;
      for (const m of s.memories) {
        if (m.characterId !== characterId || m.quote) continue;
        const at = Date.parse(m.createdAt);
        if (at > bestAt) {
          bestAt = at;
          bestId = m.id;
          bestText = m.text;
        }
      }
      return { id: bestId, text: bestText };
    }),
  );
  const seenMemoryId = useRef('');
  const [memoryNotice, setMemoryNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!freshMemory.id || freshMemory.id === seenMemoryId.current) return;
    seenMemoryId.current = freshMemory.id;
    setMemoryNotice(freshMemory.text);
    const timer = setTimeout(() => setMemoryNotice(null), 3200);
    return () => clearTimeout(timer);
  }, [freshMemory.id, freshMemory.text]);
  return [memoryNotice, setMemoryNotice] as const;
}

/**
 * "Yes, text me!": the system asks for pushes now, the moment the user is most willing. Blocked
 * pushes leave a card with a way to Settings; web and Expo Go on Android have none to ask for.
 */
export function useAfterIdea(conversationId: string | undefined) {
  const noteNotifyOff = useAppStore((s) => s.noteNotifyOff);
  return useCallback(
    (message: Message | undefined, idea: ReplyIdea) => {
      if (!conversationId || !isAskReach(message?.reach) || idea.intent !== 'yes') return;
      void (async () => {
        const status = await pushPermission();
        if (status === 'granted' || status === 'unsupported') return;
        const granted = status === 'undetermined' && (await requestPushPermission());
        if (!granted) noteNotifyOff(conversationId);
      })();
    },
    [conversationId, noteNotifyOff],
  );
}
