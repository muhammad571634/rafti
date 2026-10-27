import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ChatSearch } from '@/components/chat/chat-search';
import { CharacterAvatar, UserAvatar } from '@/components/ui';
import { useFriendName } from '@/hooks/use-friend-name';
import { focusMessage } from '@/lib/chat-focus';
import { useAppStore } from '@/store/use-app-store';

/** Search this one-to-one chat; a hit goes back to the chat in the stack, at that message. */
export default function SearchHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const characterId = Array.isArray(id) ? id[0] : id;
  const friendName = useFriendName();
  const { t } = useTranslation();
  const router = useRouter();

  const character = useAppStore((s) => s.characters.find((c) => c.id === characterId));
  const conversation = useAppStore((s) => s.conversations.find((c) => c.characterId === characterId));
  const messages = useAppStore((s) => (conversation ? s.messages[conversation.id] : undefined));
  const user = useAppStore((s) => s.user);

  return (
    <ChatSearch
      messages={messages}
      who={(m) =>
        m.author === 'me'
          ? { name: t('search.you'), avatar: <UserAvatar user={user} size={40} /> }
          : { name: character ? friendName(character) : '', avatar: character ? <CharacterAvatar character={character} size={40} /> : null }
      }
      onOpen={(m) => {
        if (!conversation) return;
        // Back to the chat already in the stack (not a second copy), at that message.
        focusMessage(conversation.id, m.id);
        router.dismissTo(`/chat/${conversation.id}`);
      }}
    />
  );
}
