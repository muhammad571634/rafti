import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BoothPicture, fitWidth } from '@/components/photo-booth/booth-picture';
import { planDate } from '@/components/plans/copy';
import { BackButton, CharacterAvatar, glassStyle, Header, PressableScale, Screen, Txt } from '@/components/ui';
import { shortName } from '@/lib/format';
import { useAppStore } from '@/store/use-app-store';
import { colors, space } from '@/theme';

/**
 * One kept Photo Booth picture, opened from the album, the chat or Us. iOS Photos look
 * (approved prototype `UsPhoto.dc.html`): back, the date over "With Castor", Send while not sent
 * (then a glass "Sent" that opens the chat), the picture on the ground, a glass caption below.
 */
export default function PhotoScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const photo = useAppStore((s) => s.photos.find((p) => p.id === id));
  const friend = useAppStore((s) => s.characters.find((c) => c.id === photo?.characterId));
  const chat = useAppStore((s) => s.conversations.find((c) => c.characterId === photo?.characterId));
  const sendPhoto = useAppStore((s) => s.sendPhoto);

  if (!photo || !friend) {
    return (
      <Screen background={colors.bg}>
        <Header />
      </Screen>
    );
  }

  const name = shortName(friend.name);
  const sent = !!photo.sentAt;

  return (
    <Screen background={colors.bg}>
      <View style={styles.bar}>
        <BackButton />
        <View style={styles.titles}>
          <Txt style={styles.date}>{planDate(Date.parse(photo.createdAt))}</Txt>
          <Txt style={styles.with}>{t('photoBooth.withName', { name })}</Txt>
        </View>
        <PressableScale
          scaleTo={0.92}
          haptic={!sent}
          accessibilityRole="button"
          accessibilityLabel={sent ? t('photoBooth.sent') : t('photoBooth.sendTo', { name })}
          onPress={() => {
            if (!sent) sendPhoto(photo.id);
            else if (chat) router.push(`/chat/${chat.id}`);
          }}
          style={[styles.send, sent ? glassStyle : styles.sendOn]}>
          <Ionicons name={sent ? 'checkmark' : 'arrow-up'} size={16} color={sent ? colors.bondText : colors.textOnPrimary} />
          <Txt style={styles.sendText} color={sent ? colors.bondText : colors.textOnPrimary}>
            {sent ? t('photoBooth.sent') : t('photoBooth.send')}
          </Txt>
        </PressableScale>
      </View>

      <View style={styles.stage}>
        <View style={styles.shadow}>
          <BoothPicture
            photo={photo}
            character={friend}
            width={fitWidth(photo.style, { width: width - space.xxxl * 2, height: height * 0.56 })}
          />
        </View>
      </View>

      <View style={[styles.captionWrap, { paddingBottom: Math.max(insets.bottom, space.xl) }]}>
        <View style={[glassStyle, styles.caption]}>
          <CharacterAvatar character={friend} size={40} />
          <View>
            <Txt style={styles.captionTitle} lines={1}>
              {t('photoBooth.together', { name })}
            </Txt>
            <Txt style={styles.captionMeta}>{t(`photoBooth.styleNames.${photo.style}`)}</Txt>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: space.xs,
  },
  titles: { position: 'absolute', left: 120, right: 120, alignItems: 'center' },
  date: { fontSize: 15, fontWeight: '600' },
  with: { fontSize: 12, color: colors.textSecondary },
  send: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.lg, borderRadius: 22 },
  sendOn: { backgroundColor: colors.primaryFill },
  sendText: { fontSize: 17, fontWeight: '600' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xxxl },
  shadow: { shadowColor: colors.black, shadowOpacity: 0.16, shadowRadius: 20, shadowOffset: { width: 0, height: 14 }, elevation: 8 },
  captionWrap: { alignItems: 'center' },
  caption: { height: 52, flexDirection: 'row', alignItems: 'center', gap: space.sm + 2, paddingLeft: 6, paddingRight: space.lg, borderRadius: 26 },
  captionTitle: { fontSize: 15, fontWeight: '600' },
  captionMeta: { fontSize: 12, color: colors.textSecondary },
});
