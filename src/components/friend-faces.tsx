import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { CharacterAvatar } from '@/components/ui/avatar';
import { useAppStore } from '@/store/use-app-store';
import { ink } from '@/theme/ink';

/** Faces for a new account, before anyone has talked: three of the cast. */
const NEW_ACCOUNT = ['c_milo', 'c_sam', 'c_jace'];

/**
 * Up to three friends' faces, overlapped, the people you talked with most recently (owner, 2026-11-18:
 * no mascot; the friends are the face of the app). Empty screens stand them where the mascot was.
 */
export function FriendFaces({ size = 64, count = 3 }: { size?: number; count?: number }) {
  const recent = useAppStore(
    useShallow((s) =>
      [...s.conversations]
        .sort((a, b) => Date.parse(b.lastMessageAt) - Date.parse(a.lastMessageAt))
        .map((c) => c.characterId)
        .slice(0, count),
    ),
  );
  const characters = useAppStore((s) => s.characters);
  const faces = useMemo(() => {
    const ids = recent.length ? recent : NEW_ACCOUNT;
    return ids.map((id) => characters.find((c) => c.id === id)).filter((c): c is NonNullable<typeof c> => !!c);
  }, [recent, characters]);
  if (!faces.length) return null;
  const overlap = Math.round(size * 0.22);
  return (
    <View style={styles.row} accessible={false} importantForAccessibility="no-hide-descendants">
      {faces.map((character, i) => (
        <View key={character.id} style={[styles.ring, { borderRadius: size / 2 + 3, marginLeft: i ? -overlap : 0, zIndex: faces.length - i }]}>
          <CharacterAvatar character={character} size={size} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  // The ground's colour around each face, so the overlap reads as a stack.
  ring: { borderWidth: 3, borderColor: ink.ground, backgroundColor: ink.ground },
});
