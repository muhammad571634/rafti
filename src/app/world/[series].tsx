import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CharacterRow } from '@/components/character-row';
import { EmptyState, Header, Screen, Txt } from '@/components/ui';
import { useAppStore } from '@/store/use-app-store';
import { colors, space } from '@/theme';

/** A whole world from Find: everyone in it, with how many can take a call. */
export default function WorldScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { series } = useLocalSearchParams<{ series: string }>();

  const characters = useAppStore((s) => s.characters);
  const conversations = useAppStore((s) => s.conversations);
  const addFriend = useAppStore((s) => s.addFriend);
  const blockedIds = useAppStore((s) => s.blockedIds);

  const people = useMemo(
    () => characters.filter((c) => (c.series ?? 'Other') === series && !blockedIds.includes(c.id)),
    [characters, series, blockedIds],
  );
  const friendIds = useMemo(() => new Set(conversations.map((c) => c.characterId)), [conversations]);
  const voices = people.filter((c) => c.voiceReady).length;

  return (
    <Screen background={colors.bgPlain}>
      <Header title={series} />
      {people.length === 0 ? (
        <EmptyState title={t('find.noResults')} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.stats}>
            <Stat icon="people" value={people.length} label={t('find.characters')} />
            <Stat icon="call" value={voices} label={t('find.canCall')} />
          </View>
          {people.map((character) => (
            <CharacterRow
              key={character.id}
              character={character}
              isFriend={friendIds.has(character.id)}
              onOpen={() => router.push(`/character/${character.id}`)}
              onAdd={() => addFriend(character.id)}
            />
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

function Stat({ icon, value, label }: { icon: 'people' | 'call'; value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={18} color={icon === 'call' ? colors.bondText : colors.text} />
      <Txt variant="figure">{value}</Txt>
      <Txt variant="smallStrong" color={colors.textMuted}>
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: space.huge },
  stats: { flexDirection: 'row', gap: space.xl, paddingHorizontal: space.lg, paddingVertical: space.md },
  stat: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
});
