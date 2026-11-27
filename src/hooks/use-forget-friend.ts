import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { dropSelfie } from '@/lib/booth-selfies';
import { chatDrafts } from '@/lib/chat-drafts';
import { confirmAction } from '@/lib/confirm';
import { forgetNotes } from '@/lib/voice-files';
import { useAppStore } from '@/store/use-app-store';
import type { Character } from '@/types';

/**
 * Takes a friend out of the user's life (0z181): `remove` (a friend from Find; Find keeps them),
 * `delete` (a character the user made) or `block`. The store forgets everything they had together
 * (`forgetFriend`); the files on the phone go too: their photos' selfies, chat drafts, voice notes.
 */
export function forgetFriendNow(characterId: string, how: 'remove' | 'delete' | 'block') {
  const state = useAppStore.getState();
  const selfies = state.photos.flatMap((p) => (p.characterId === characterId && p.selfie ? [p.selfie] : []));
  const chats = state.conversations.filter((c) => c.characterId === characterId).map((c) => c.id);
  if (how === 'block') state.blockCharacter(characterId);
  else if (how === 'delete') state.deleteCharacter(characterId);
  else state.removeFriend(characterId);
  for (const file of selfies) void dropSelfie(file);
  for (const id of chats) {
    chatDrafts.forget(id);
    void forgetNotes(id);
  }
}

/** Asks first (it cannot be undone), then removes a friend from Find or deletes one the user made. */
export function useForgetFriend() {
  const { t } = useTranslation();
  return useCallback(
    (character: Pick<Character, 'id' | 'isOfficial'>, name: string, after?: () => void) => {
      const own = !character.isOfficial;
      confirmAction({
        title: t(own ? 'friendRemove.deleteTitle' : 'friendRemove.removeTitle', { name }),
        message: t(own ? 'friendRemove.deleteBody' : 'friendRemove.removeBody'),
        action: t(own ? 'common.delete' : 'friendRemove.remove'),
        cancel: t('common.cancel'),
        onConfirm: () => {
          forgetFriendNow(character.id, own ? 'delete' : 'remove');
          after?.();
        },
      });
    },
    [t],
  );
}
