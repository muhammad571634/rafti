import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Anim, Card, Header, PressableScale, Screen, Txt } from '@/components/ui';
import { radioTracks } from '@/mock';
import { colors, radius, space } from '@/theme';

export default function RadioScreen() {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState<string | null>(null);

  return (
    <Screen>
      <Header title={t('radio.title')} subtitle={t('radio.subtitle')} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {radioTracks.map((track) => {
          const active = playing === track.id;

          return (
            <Card
              key={track.id}
              onPress={() => setPlaying(active ? null : track.id)}
              style={[styles.card, active && styles.cardActive] as never}>
              <View style={styles.row}>
                <View style={[styles.icon, active && styles.iconActive]}>
                  <Txt style={styles.emoji}>{track.emoji}</Txt>
                </View>

                <View style={styles.body}>
                  <Txt variant="title">{t(`radio.tracks.${track.titleKey}`)}</Txt>
                  <Txt variant="caption" color={colors.textMuted}>
                    {t('radio.minutes', { count: track.minutes })}
                  </Txt>
                </View>

                {active ? (
                  <Anim name="voiceWave" size={30} tint={colors.primary} />
                ) : (
                  <Ionicons name="play" size={20} color={colors.textFaint} />
                )}
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space.lg, gap: space.md, paddingBottom: space.huge },
  card: { borderWidth: 1.5, borderColor: 'transparent' },
  cardActive: { borderColor: colors.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  icon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActive: { backgroundColor: colors.primarySofter },
  emoji: { fontSize: 22 },
  body: { flex: 1, gap: 2 },
});
