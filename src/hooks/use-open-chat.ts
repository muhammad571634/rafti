import { useNavigation, useRouter } from 'expo-router';
import { useCallback } from 'react';

/**
 * Opens a one-to-one chat from a screen in the root stack without stacking a second copy of it:
 * when that chat is already under this screen (chat → settings → profile → Message) it goes back
 * to it; otherwise the chat is pushed on top, so back returns here (Find → profile → Message →
 * back lands on the profile, as in Messages or Instagram). `dismissTo` alone replaced this screen
 * when the chat was not in the stack, so back skipped the profile.
 */
export function useOpenChat() {
  const router = useRouter();
  const navigation = useNavigation();
  return useCallback(
    (conversationId: string) => {
      const routes = navigation.getState()?.routes ?? [];
      const below = routes.some((r) => r.name === 'chat/[id]' && (r.params as { id?: string } | undefined)?.id === conversationId);
      if (below) router.dismissTo(`/chat/${conversationId}`);
      else router.push(`/chat/${conversationId}`);
    },
    [navigation, router],
  );
}
