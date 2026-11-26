import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { InkText, PillButton } from '@/components/ink';
import { CharacterAvatar, Sheet } from '@/components/ui';
import { shortName } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { MOOD_KEYS } from '@/lib/mood';
import { displayName, useAppStore } from '@/store/use-app-store';
import { space } from '@/theme';

import { MoodSlider } from './mood-slider';

/** Where the thumb starts: the honest middle ("Okay"), never a guess at how they feel. */
const START = 3;

/**
 * Today's mood check-in: who it goes to, the question, the mood slider and one pill. Sharing sends the
 * feeling into that friend's chat as a mood card (`shareMood`), opens the chat, and the friend answers
 * in their own voice; out of shells it opens the shell store, as every paid line does.
 */
export function MoodSheet({ visible, onClose, characterId }: { visible: boolean; onClose: () => void; characterId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const shareMood = useAppStore((s) => s.shareMood);
  const character = useAppStore((s) => s.characters.find((c) => c.id === characterId));
  const bond = useAppStore((s) => s.relationships[characterId]);
  const [band, setBand] = useState(START);
  const words = useMemo(() => MOOD_KEYS.map((key) => t(`mood.band.${key}`)), [t]);

  // Each opening starts from the middle again.
  useEffect(() => {
    if (visible) setBand(START);
  }, [visible]);

  if (!character) return null;
  const name = shortName(displayName(character, bond));

  const share = () => {
    const result = shareMood(characterId, band);
    if (result === 'noShells') {
      onClose();
      router.push('/store/shell?tab=shells');
      return;
    }
    onClose();
    if (result !== 'sent') return;
    haptic.success();
    const chat = useAppStore.getState().conversations.find((c) => c.characterId === characterId)?.id;
    if (chat) router.push(`/chat/${chat}`);
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={styles.friend}>
        <CharacterAvatar character={character} size={28} />
        <InkText variant="sub" lines={1}>
          {name}
        </InkText>
      </View>
      <InkText variant="title" style={styles.question}>
        {t('mood.question')}
      </InkText>
      <MoodSlider value={band} onChange={setBand} words={words} active={visible} />
      <PillButton label={t('mood.share', { name })} onPress={share} style={styles.pill} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  friend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  question: { textAlign: 'center', marginTop: space.md, marginBottom: space.sm },
  pill: { marginTop: space.lg },
});
