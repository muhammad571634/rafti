import { useMemo } from 'react';

import { computeDiscoveryWeights, type DiscoveryWeights } from '@/lib/discovery-rank';
import { useAppStore } from '@/store/use-app-store';

/**
 * Memoized discovery preference weights combining Day-1 onboarding cold-start signals
 * (`user.pronouns` and first companion) with implicit behavioral engagement.
 */
export function useDiscoveryWeights(): DiscoveryWeights {
  const pronouns = useAppStore((s) => s.user.pronouns);
  const characters = useAppStore((s) => s.characters);
  const conversations = useAppStore((s) => s.conversations);
  const messages = useAppStore((s) => s.messages);
  const relationships = useAppStore((s) => s.relationships);
  const recentlyViewed = useAppStore((s) => s.recentlyViewed);

  return useMemo(
    () =>
      computeDiscoveryWeights({
        user: { pronouns },
        characters,
        conversations,
        messagesByConversation: messages,
        relationships,
        recentlyViewed,
        nowMs: Date.now(),
      }),
    [pronouns, characters, conversations, messages, relationships, recentlyViewed],
  );
}
