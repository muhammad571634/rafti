import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useOnPhoto } from '@/components/chat/chat-ground';
import { IconButton, PressableScale, Txt } from '@/components/ui';
import { colors, fonts, hitSlop, playful, space, systemColors } from '@/theme';

/** Room the header takes under the status bar: one row of 46pt round buttons and the face. */
export const HEADER_ROOM = 64;
/** The fade under the solid header ground. */
const FADE = 20;
const ROUND = 46;

/** The same colour, fully transparent: the end of the fade under the header. */
const fadeOut = (color: string) => (/^#[0-9a-f]{6}$/i.test(color) ? `${color}00` : 'transparent');

/**
 * The chat's ground under the header: solid under the row, then a short fade, so bubbles slide
 * away beneath it and never show through the name.
 */
export function HeaderFade({ color, room }: { color: string; room: number }) {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[color, color, fadeOut(color)]}
      locations={[0, room / (room + FADE), 1]}
      style={[styles.fade, { height: room + FADE }]}
    />
  );
}

/**
 * The header of a chat or a group in the four tabs' look (owner, 2026-11-08, canvas v3): a round
 * back button, then the friend (or the group) left-aligned, their face and heavy rounded name with a
 * status line under it (what they are, their mood, "typing…"); a tap opens their settings or info.
 * One round call button on the right. On a picture the buttons are clear glass and the words white.
 */
export function ChatHeader({
  avatar,
  title,
  caption,
  identityLabel,
  onIdentity,
  online,
  missedCall,
  callLabel,
  onCall,
  below,
}: {
  avatar: React.ReactNode;
  title: string;
  caption: React.ReactNode;
  identityLabel: string;
  onIdentity: () => void;
  /** A green dot on the face: they are here (one-to-one chats). */
  online?: boolean;
  missedCall?: boolean;
  callLabel: string;
  onCall: () => void;
  /** Under the header row, e.g. the ringing alarm bar. */
  below?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const onPhoto = useOnPhoto();
  const round = [styles.round, onPhoto && styles.photoRound];
  const ink = onPhoto ? colors.onMedia : colors.text;

  return (
    <View style={[styles.header, { paddingTop: insets.top + space.xs }]} pointerEvents="box-none">
      <View style={styles.row} pointerEvents="box-none">
        <PressableScale
          onPress={() => router.back()}
          hitSlop={hitSlop}
          scaleTo={0.88}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.back')}
          style={round}>
          <Ionicons name="chevron-back" size={26} color={ink} style={styles.backGlyph} />
        </PressableScale>

        <PressableScale style={styles.identity} scaleTo={0.97} accessibilityRole="button" accessibilityLabel={identityLabel} onPress={onIdentity}>
          <View>
            {avatar}
            {online ? <View style={[styles.online, onPhoto && styles.onlineOnPhoto]} /> : null}
          </View>
          <View style={styles.names}>
            <Txt style={[styles.title, onPhoto && styles.photoShadow]} color={ink} lines={1}>
              {title}
            </Txt>
            <View style={styles.caption}>{caption}</View>
          </View>
        </PressableScale>

        <IconButton
          icon="call-outline"
          size={23}
          color={ink}
          dot={missedCall}
          style={round}
          accessibilityLabel={callLabel}
          onPress={onCall}
        />
      </View>
      {below ? <View style={styles.below}>{below}</View> : null}
    </View>
  );
}

/** Caption text under the name ("AI character", "In a good mood", "2 members"). */
export function CaptionText({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <Txt style={[styles.captionText, strong && styles.captionStrong, useOnPhoto() && styles.photoCaption]} lines={1}>
      {children}
    </Txt>
  );
}

/** The small dot between caption parts. */
export function CaptionDot() {
  return <View style={[styles.captionDot, useOnPhoto() && styles.photoDot]} />;
}

const styles = StyleSheet.create({
  header: { position: 'absolute', top: 0, left: 0, right: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 2, paddingHorizontal: space.lg },
  fade: { position: 'absolute', top: 0, left: 0, right: 0 },
  round: { width: ROUND, height: ROUND, borderRadius: ROUND / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: playful.round },
  photoRound: { backgroundColor: colors.onMediaGlass, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.onMediaHairline },
  backGlyph: { marginLeft: -2 },
  identity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: space.sm + 2 },
  online: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: playful.ground,
    backgroundColor: systemColors.green,
  },
  onlineOnPhoto: { borderColor: colors.black },
  names: { flex: 1, minWidth: 0 },
  title: { fontFamily: fonts.playful, fontSize: 22, lineHeight: 27 },
  caption: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  captionText: { fontSize: 13, lineHeight: 17, fontWeight: '600', color: colors.textSecondary, flexShrink: 1 },
  captionStrong: { color: colors.text },
  captionDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.textSecondary },
  below: { marginTop: space.sm },
  photoShadow: { textShadowColor: colors.onMediaShadow, textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
  photoCaption: { color: colors.onMediaSoft, textShadowColor: colors.onMediaShadow, textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  photoDot: { backgroundColor: colors.onMediaSoft },
});
