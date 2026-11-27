import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { useAppStore } from '@/store/use-app-store';
import type { Message } from '@/types';

/**
 * Their newest reply's inner thought (owner's pick A, 2026-11-18), out of `src/app/chat/[id].tsx`
 * (0z359): the cloud under it, the words under the reply once opened, a sheet when today's free ones
 * are used. Behaviour unchanged.
 */
export function useThought(conversationId: string | undefined, burst: readonly Message[] | undefined, typing: boolean) {
  const router = useRouter();
  const thoughtLine = useMemo(() => (typing ? undefined : burst?.findLast((m) => !!m.thought)), [burst, typing]);
  const [thoughtOpenId, setThoughtOpenId] = useState<string | null>(null);
  const [thoughtPayId, setThoughtPayId] = useState<string | null>(null);
  const openThought = useAppStore((s) => s.openThought);
  const tapThought = useCallback(
    (messageId: string, pay = false) => {
      if (!conversationId) return;
      if (!pay && thoughtOpenId === messageId) return setThoughtOpenId(null);
      const result = openThought(conversationId, messageId, pay);
      if (result === 'open') {
        setThoughtPayId(null);
        setThoughtOpenId(messageId);
      } else if (result === 'pay') setThoughtPayId(messageId);
      else if (result === 'noShells') {
        // Free shells can burn at midnight while the sheet is open: the packs, not a dead button.
        setThoughtPayId(null);
        router.push('/store/shell?tab=shells');
      }
    },
    [conversationId, openThought, thoughtOpenId, router],
  );
  return { thoughtLine, thoughtOpenId, setThoughtOpenId, thoughtPayId, setThoughtPayId, tapThought };
}
