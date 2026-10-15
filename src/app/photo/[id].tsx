import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BoothPicture, fitWidth } from '@/components/photo-booth/booth-picture';
import { SendPill } from '@/components/photo-booth/send-pill';
import { planDate } from '@/components/plans/copy';
import { CharacterAvatar, Header, Screen, Txt } from '@/components/ui';
import { shortName } from '@/lib/format';
import { useAppStore } from '@/store/use-app-store';
import { colors, space } from '@/theme';

/** One kept Photo Booth picture, opened from the album, the chat or Us; Send while not sent. */
export default function PhotoScreen() {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const photo = useAppStore((s) => s.photos.find((p) => p.id === id));
  const friend = useAppStore((s) => s.characters.find((c) => c.id === photo?.characterId));

  if (!photo || !friend) {
    return (
      <Screen background={colors.bgPlain}>
        <Header />
      </Screen>
    );
  }

  return (
    <Screen background={colors.bgPlain}>
      <Header title={planDate(Date.parse(photo.createdAt))} right={<SendPill photo={photo} style={styles.send} />} />
      <View style={styles.stage}>
        <BoothPicture
          photo={photo}
          character={friend}
          width={fitWidth(photo.style, { width: width - space.xxxl * 2, height: height * 0.58 })}
        />
      </View>
      <View style={[styles.meta, { paddingBottom: Math.max(insets.bottom, space.xl) }]}>
        <CharacterAvatar character={friend} size={36} />
        <View style={styles.flex}>
          <Txt variant="bodyStrong" lines={1}>
            {t('photoBooth.together', { name: shortName(friend.name) })}
          </Txt>
          <Txt variant="small" color={colors.textSecondary}>
            {t(`photoBooth.styleNames.${photo.style}`)}
          </Txt>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  send: { marginRight: space.sm, backgroundColor: colors.surfaceAlt },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xxxl },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.xl },
});
