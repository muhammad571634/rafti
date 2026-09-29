import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { PaywallSheet } from '@/components/paywall-sheet';
import { ShellIcon, CharacterAvatar, Header, PressableScale, Screen, Txt } from '@/components/ui';
import { dateScenarios } from '@/mock';
import { useAppStore } from '@/store/use-app-store';
import { avatarGradients, colors, radius, shadows, space } from '@/theme';

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
    <Screen>
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
            />
            <Txt
              variant="tiny"
              lines={1}
              color={character.id === partnerId ? colors.primary : colors.textMuted}>
              {character.name}
            </Txt>
          </PressableScale>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {dateScenarios.map((scenario, index) => {
          const locked = level < scenario.levelRequired;
          const tint = avatarGradients[index % avatarGradients.length];

          return (
            <PressableScale
              key={scenario.id}
              scaleTo={0.98}
              disabled={locked}
              onPress={() => start(scenario)}>
              <LinearGradient colors={tint} style={[styles.scenario, shadows.card]}>
                <Txt style={styles.scenarioEmoji}>{scenario.emoji}</Txt>

                <View style={styles.scenarioBody}>
                  <Txt variant="title" color={colors.white} lines={2}>
                    {t(`dating.scenarios.${scenario.titleKey}`)}
                  </Txt>
                  {locked ? (
                    <Txt variant="caption" color="rgba(255,255,255,0.85)">
                      {t('dating.locked', { level: scenario.levelRequired })}
                    </Txt>
                  ) : (
                    <View style={styles.cost}>
                      <ShellIcon size={14} />
                      <Txt variant="caption" color={colors.white}>
                        {scenario.cost}
                      </Txt>
                    </View>
                  )}
                </View>

                <Ionicons
                  name={locked ? 'lock-closed' : 'chevron-forward'}
                  size={20}
                  color={colors.white}
                />
              </LinearGradient>
            </PressableScale>
          );
        })}
      </ScrollView>

      <PaywallSheet need={paywall} onClose={() => setPaywall(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  partnerRow: { flexGrow: 0 },
  partners: { paddingHorizontal: space.lg, gap: space.lg, paddingBottom: space.md },
  partner: { alignItems: 'center', gap: space.xs, width: 60 },
  scroll: { padding: space.lg, gap: space.md, paddingBottom: space.huge },
  scenario: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
  },
  scenarioEmoji: { fontSize: 32 },
  scenarioBody: { flex: 1, gap: 2 },
  cost: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
