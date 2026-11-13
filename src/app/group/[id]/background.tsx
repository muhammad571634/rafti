import { useLocalSearchParams, useRouter } from 'expo-router';

import { BackgroundPicker } from '@/components/background-picker';
import { useAppStore } from '@/store/use-app-store';

/** A group chat's background, from its info screen: the same picker as a one-to-one chat. */
export default function GroupBackgroundScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const savedId = useAppStore((s) => s.groups.find((g) => g.id === groupId)?.backgroundId);
  const setGroupBackground = useAppStore((s) => s.setGroupBackground);

  return (
    <BackgroundPicker
      savedId={savedId}
      onPick={(backgroundId) => {
        if (!groupId) return;
        setGroupBackground(groupId, backgroundId);
        // Straight back to the group to see it there (not one step, to its info).
        router.dismissTo(`/group/${groupId}`);
      }}
    />
  );
}
