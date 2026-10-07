import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Anim, ClayIcon, Divider, Header, ListRow, Screen } from '@/components/ui';
import { radioTracks } from '@/mock';
import { colors, radius, space } from '@/theme';

export default function RadioScreen() {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState<string | null>(null);

  return (
    <Screen background={colors.bgPlain}>
      <Header title={t('radio.title')} subtitle={t('radio.subtitle')} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {radioTracks.map((track, index) => {
          const active = playing === track.id;

          return (
            <View key={track.id}>
              {index > 0 ? <Divider inset={space.lg + COVER + space.md} /> : null}
              <ListRow
                title={t(`radio.tracks.${track.titleKey}`)}
                subtitle={t('radio.minutes', { count: track.minutes })}
                left={<ClayIcon name={track.icon} size={COVER} radius={radius.md} />}
                right={
                  active ? (
                    <Anim name="voiceWave" size={30} tint={colors.text} />
                  ) : (
                    <Ionicons name="play-outline" size={20} color={colors.textMuted} />
                  )
                }
                onPress={() => setPlaying(active ? null : track.id)}
                style={active && styles.active}
              />
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const COVER = 48;

const styles = StyleSheet.create({
  scroll: { paddingTop: space.sm, paddingBottom: space.huge },
  active: { backgroundColor: colors.surfaceAlt },
});
