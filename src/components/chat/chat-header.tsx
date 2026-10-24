import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { glassStyle, IconButton, PressableScale, ShellIcon, Txt } from '@/components/ui';
import { colors, hitSlop, space } from '@/theme';

/** Room the glass header takes under the status bar: avatar, name chip and caption. */
export const HEADER_ROOM = 112;
/** The fade under the solid header ground. */
const FADE = 20;

/** The same colour, fully transparent: the end of the fade under the header. */
const fadeOut = (color: string) => (/^#[0-9a-f]{6}$/i.test(color) ? `${color}00` : 'transparent');

/**
 * The chat's ground under the glass header: solid under avatar, name and caption, then a short
 * fade, so bubbles slide away beneath it and never show through the caption.
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
 * The glass header of a chat or a group (approved prototypes `Chat.dc.html`, `GroupChat.dc.html`):
 * back on the left; the friend (or the group) in the middle with a name chip and a caption, a
 * tap opening their settings or info; shells and call in one capsule on the right.
 */
export function ChatHeader({
  avatar,
  title,
  caption,
  identityLabel,
  onIdentity,
  shells,
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
  shells: number;
  missedCall?: boolean;
  callLabel: string;
  onCall: () => void;
  /** Under the header row, e.g. the ringing alarm bar. */
  below?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + space.xs }]} pointerEvents="box-none">
      <View style={styles.row} pointerEvents="box-none">
        <PressableScale
          onPress={() => router.back()}
          hitSlop={hitSlop}
          scaleTo={0.88}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.back')}
          style={[glassStyle, styles.round]}>
          <Ionicons name="chevron-back" size={24} color={colors.text} style={styles.backGlyph} />
        </PressableScale>

        <PressableScale
          style={styles.identity}
          scaleTo={0.96}
          accessibilityRole="button"
          accessibilityLabel={identityLabel}
          onPress={onIdentity}>
          {avatar}
          <View style={[glassStyle, styles.nameChip]}>
            <Txt style={styles.nameText} lines={1}>
              {title}
            </Txt>
            <Ionicons name="chevron-forward" size={11} color={colors.textSecondary} />
          </View>
          <View style={styles.caption}>{caption}</View>
        </PressableScale>

        <View style={[glassStyle, styles.capsule]}>
          <View>
            <PressableScale
              scaleTo={0.92}
              onPress={() => router.push('/store/shell?tab=shells')}
              accessibilityRole="button"
              accessibilityLabel={`${shells} ${t('common.shells')}`}
              style={styles.shells}>
              <ShellIcon size={16} />
              <Txt style={styles.shellCount}>{shells}</Txt>
            </PressableScale>
            <SpendPulse shells={shells} />
          </View>
          <View style={styles.capsuleLine} />
          <IconButton icon="call-outline" size={20} dot={missedCall} style={styles.callButton} accessibilityLabel={callLabel} onPress={onCall} />
        </View>
      </View>
      {below ? <View style={styles.below}>{below}</View> : null}
    </View>
  );
}

/** Caption text under the name chip ("AI character", "2 members"). */
export function CaptionText({ children }: { children: React.ReactNode }) {
  return <Txt style={styles.captionText}>{children}</Txt>;
}

/** The small dot between caption parts. */
export function CaptionDot() {
  return <View style={styles.captionDot} />;
}

/** A "-1" that floats off the shell count whenever a message is paid for. */
function SpendPulse({ shells }: { shells: number }) {
  const { t } = useTranslation();
  const prev = useRef(shells);
  const [spent, setSpent] = useState(0);
  const lift = useSharedValue(0);

  useEffect(() => {
    const diff = prev.current - shells;
    prev.current = shells;
    if (diff <= 0) return;
    setSpent(diff);
    lift.value = 0;
    lift.value = withSequence(withTiming(1, { duration: 900 }), withTiming(0, { duration: 0 }));
  }, [shells, lift]);

  const style = useAnimatedStyle(() => ({
    opacity: lift.value === 0 ? 0 : 1 - lift.value * 0.9,
    transform: [{ translateY: -lift.value * 14 }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.pulse, style]} accessibilityLabel={t('chat.spent', { count: spent })}>
      <Txt variant="smallStrong" color={colors.brandText}>
        -{spent}
      </Txt>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: { position: 'absolute', top: 0, left: 0, right: 0 },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: space.lg },
  fade: { position: 'absolute', top: 0, left: 0, right: 0 },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  backGlyph: { marginLeft: -2 },
  // Centred between the side buttons; it may not crowd them.
  identity: { flex: 1, alignItems: 'center', marginHorizontal: space.sm },
  nameChip: {
    marginTop: space.xs,
    height: 26,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingLeft: space.md,
    paddingRight: space.sm + 2,
    borderRadius: 13,
  },
  nameText: { fontSize: 13, fontWeight: '600', letterSpacing: -0.1, flexShrink: 1 },
  caption: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  captionText: { fontSize: 11, color: colors.textSecondary },
  captionDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.textSecondary },
  capsule: { height: 44, borderRadius: 22, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  shells: { height: 36, flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: space.sm + 2, paddingRight: space.sm },
  shellCount: { fontSize: 15, fontWeight: '600' },
  capsuleLine: { width: StyleSheet.hairlineWidth, height: 20, backgroundColor: colors.borderStrong },
  callButton: { width: 40, height: 36 },
  below: { marginTop: space.sm },
  pulse: { position: 'absolute', right: space.xs, bottom: -space.lg },
});
