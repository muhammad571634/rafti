import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ChatSearch } from '@/components/chat/chat-search';
import { CharacterAvatar, UserAvatar } from '@/components/ui';
import { focusMessage } from '@/lib/chat-focus';
import { displayName, useAppStore } from '@/store/use-app-store';

/** Search a group chat (from Group info); a hit goes back to the group, at that message. */
export default function GroupSearchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Array.isArray(id) ? id[0] : id;
  const { t } = useTranslation();
  const router = useRouter();

  const messages = useAppStore((s) => (groupId ? s.messages[groupId] : undefined));
  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);
  const user = useAppStore((s) => s.user);

  return (
    <ChatSearch
      messages={messages}
      who={(m) => {
        if (m.author === 'me') return { name: t('search.you'), avatar: <UserAvatar user={user} size={40} /> };
        const member = characters.find((c) => c.id === m.characterId);
        return member
          ? { name: displayName(member, relationships[member.id]), avatar: <CharacterAvatar character={member} size={40} /> }
          : { name: '', avatar: null };
      }}
      onOpen={(m) => {
        if (!groupId) return;
        focusMessage(groupId, m.id);
        router.dismissTo({ pathname: '/group/[id]', params: { id: groupId } });
      }}
    />
  );
}
