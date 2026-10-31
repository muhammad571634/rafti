import { useLocalSearchParams, useRouter } from 'expo-router';

import { BackgroundPicker } from '@/components/background-picker';
import { useAppStore } from '@/store/use-app-store';

/** A one-to-one chat's background, from its settings (`BackgroundPicker`). */
export default function ChangeBackgroundScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const characterId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const savedId = useAppStore((s) => (characterId ? s.relationships[characterId]?.backgroundId : undefined));
  const setBackground = useAppStore((s) => s.setBackground);
  const conversation = useAppStore((s) => s.conversations.find((c) => c.characterId === characterId));

  return (
    <BackgroundPicker
      savedId={savedId}
      onPick={(backgroundId) => {
        if (characterId) setBackground(characterId, backgroundId);
        // Straight back to the chat to see it there (not one step, to the settings).
        if (conversation) router.dismissTo(`/chat/${conversation.id}`);
        else router.back();
      }}
    />
  );
}
