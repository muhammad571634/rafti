import { useLocalSearchParams, useRouter } from 'expo-router';

import { PORTRAITS } from '@/assets/portraits/registry';
import { BackgroundPicker } from '@/components/background-picker';
import { PORTRAIT_BG } from '@/mock';
import { useAppStore } from '@/store/use-app-store';

/** A group chat's background, from its info screen: the same picker as a one-to-one chat. */
export default function GroupBackgroundScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const group = useAppStore((s) => s.groups.find((g) => g.id === groupId));
  const setGroupBackground = useAppStore((s) => s.setGroupBackground);
  const storyCover = group?.story ? PORTRAITS[group.story.id] : undefined;

  return (
    <BackgroundPicker
      savedId={group?.backgroundId ?? (storyCover ? PORTRAIT_BG : undefined)}
      portrait={storyCover ? { source: storyCover, position: 'top' } : undefined}
      name={group?.name}
      onPick={(backgroundId) => {
        if (!groupId) return;
        setGroupBackground(groupId, backgroundId);
        // Straight back to the group to see it there (not one step, to its info).
        router.dismissTo(`/group/${groupId}`);
      }}
    />
  );
}
