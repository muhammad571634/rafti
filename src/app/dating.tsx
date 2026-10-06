import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { PaywallSheet } from '@/components/paywall-sheet';
import { CharacterAvatar, Divider, Header, ListRow, PressableScale, Screen, SectionLabel, Txt } from '@/components/ui';
import { dateScenarios } from '@/mock';
import { useAppStore } from '@/store/use-app-store';
import { colors, radius, space } from '@/theme';

export default function DatingScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);
  const conversations = useAppStore((s) => s.conversations);
  const startDate = useAppStore((s) => s.startDate);

  const known = useMemo(
    () => characters.filter((c) => relationships[c.id] && conversations.some((v) => v.characterId === c.id)),
    [characters, relationships, conversations],
  );

  const [partnerId, setPartnerId] = useState(known[0]?.id);
  const [paywall, setPaywall] = useState<number | null>(null);

  const partner = known.find((c) => c.id === partnerId);
  const level = partner ? (relationships[partner.id]?.level ?? 1) : 1;

  const start = (scenario: (typeof dateScenarios)[number]) => {
    if (!partner) return;
    const title = t(`dating.scenarios.${scenario.titleKey}`);
    const result = startDate(partner.id, scenario.cost, scenario.levelRequired, title);
    if (result === 'noShells') return setPaywall(scenario.cost);
    if (result !== 'ok') return;
    // The date plays out in the chat thread, which opens on the scene card.
    const conversation = conversations.find((c) => c.characterId === partner.id);
    if (conversation) router.push(`/chat/${conversation.id}`);
  };

  return (
    <Screen background={colors.bgPlain}>
      <Header title={t('dating.title')} subtitle={t('dating.subtitle')} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.partnerRow}
        contentContainerStyle={styles.partners}>
        {known.map((character) => (
          <PressableScale
            key={character.id}
            style={styles.partner}
            scaleTo={0.93}
            onPress={() => setPartnerId(character.id)}>
            <CharacterAvatar character={character}
              size={52}
              ring={character.id === partnerId}
              ringColor={colors.text}
            />
            <Txt
              variant="tiny"
              lines={1}
              color={character.id === partnerId ? colors.text : colors.textMuted}>
              {character.name}
            </Txt>
          </PressableScale>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <SectionLabel title={t('dating.pick')} />
        {dateScenarios.map((scenario, index) => {
          const locked = level < scenario.levelRequired;
          return (
            <View key={scenario.id}>
              {index > 0 ? <Divider inset={space.lg + SCENE + space.md} /> : null}
              <ListRow
                title={t(`dating.scenarios.${scenario.titleKey}`)}
                subtitle={
                  locked
                    ? t('dating.locked', { level: scenario.levelRequired })
                    : t('chat.shellCost', { count: scenario.cost })
                }
                left={
                  <View style={styles.scene}>
                    <Txt style={styles.sceneEmoji}>{scenario.emoji}</Txt>
                  </View>
                }
                right={locked ? <Ionicons name="lock-closed-outline" size={18} color={colors.textFaint} /> : null}
                chevron={!locked}
                onPress={locked ? undefined : () => start(scenario)}
              />
            </View>
          );
        })}
      </ScrollView>

      <PaywallSheet need={paywall} onClose={() => setPaywall(null)} />
    </Screen>
  );
}

const SCENE = 44;

const styles = StyleSheet.create({
  partnerRow: { flexGrow: 0 },
  partners: { paddingHorizontal: space.lg, gap: space.lg, paddingBottom: space.sm },
  partner: { alignItems: 'center', gap: space.xs, width: 60 },
  scroll: { paddingBottom: space.huge },
  // The scene's own emoji, on the same soft squircle as an IconTile.
  scene: {
    width: SCENE,
    height: SCENE,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sceneEmoji: { fontSize: 22, lineHeight: 28 },
});
