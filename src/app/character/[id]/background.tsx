import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

import { BackgroundPicker } from '@/components/background-picker';
import { portraitOf } from '@/components/chat/chat-ground';
import { displayName, useAppStore } from '@/store/use-app-store';

/** A one-to-one chat's background, from its settings (`BackgroundPicker`); their own picture leads Art. */
export default function ChangeBackgroundScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const characterId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const savedId = useAppStore((s) => (characterId ? s.relationships[characterId]?.backgroundId : undefined));
  const setBackground = useAppStore((s) => s.setBackground);
  const conversation = useAppStore((s) => s.conversations.find((c) => c.characterId === characterId));
  const character = useAppStore((s) => s.characters.find((c) => c.id === characterId));
  const relationship = useAppStore((s) => (characterId ? s.relationships[characterId] : undefined));
  const portrait = useMemo(() => (character ? portraitOf(character, width / height) : undefined), [character, width, height]);

  return (
    <BackgroundPicker
      savedId={savedId}
      portrait={portrait}
      portraitLabel={character ? displayName(character, relationship) : ''}
      onPick={(backgroundId) => {
        if (characterId) setBackground(characterId, backgroundId);
        // Straight back to the chat to see it there (not one step, to the settings).
        if (conversation) router.dismissTo(`/chat/${conversation.id}`);
        else router.back();
      }}
    />
  );
}
