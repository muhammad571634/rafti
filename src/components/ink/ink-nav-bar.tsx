import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { CharacterAvatar, PressableScale } from '@/components/ui';
import { hitSlop } from '@/theme';
import { ink, inkGutter, inkRadius } from '@/theme/ink';
import type { Character } from '@/types';

import { InkText } from './ink-text';

const BTN = 40;
const GLASS_RIM = 'rgba(255,255,255,0.11)';
const SCROLLED_BG = 'rgba(9,9,13,0.92)';
const PILL_BG = 'rgba(22,22,30,0.78)';

export interface InkIconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  accessibilityLabel: string;
  onPress: () => void;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/** Unified 40 pt dark-glass circle button for Ink Night+ top bars (zero live blur for 60 fps on A51). */
export function InkIconButton({
  icon,
  accessibilityLabel,
  onPress,
  size = 20,
  color,
  style,
}: InkIconButtonProps) {
  const glyphColor = color ?? (icon === 'add' ? ink.accent : ink.text);
  return (
    <PressableScale
      scaleTo={0.9}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[styles.circle, style]}>
      <Ionicons name={icon} size={size} color={glyphColor} style={icon === 'chevron-back' && styles.backNudge} />
    </PressableScale>
  );
}

export interface InkGlassPillProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  onPress: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** Quiet 36 pt dark-glass action capsule (e.g. "Surprise me", "New question", "Edit"). */
export function InkGlassPill({
  label,
  icon,
  iconColor = ink.accent,
  onPress,
  accessibilityLabel,
  style,
}: InkGlassPillProps) {
  return (
    <PressableScale
      scaleTo={0.94}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={[styles.pill, style]}>
      {icon ? <Ionicons name={icon} size={14} color={iconColor} /> : null}
      <InkText variant="footnoteStrong" color={ink.accent} lines={1} style={styles.pillText}>
        {label}
      </InkText>
    </PressableScale>
  );
}

export interface InkFriendPillProps {
  character: Character;
  name: string;
  ringColor: string;
  onPress?: () => void;
  accessibilityLabel?: string;
}

/** Centered friend identity pill in the top bar: ringed avatar + short name, optionally tappable. */
export function InkFriendPill({ character, name, ringColor, onPress, accessibilityLabel }: InkFriendPillProps) {
  const inner = (
    <>
      <View style={[styles.avatarRing, { borderColor: ringColor }]}>
        <CharacterAvatar character={character} size={24} />
      </View>
      <InkText variant="footnoteStrong" color={ink.text} lines={1} style={styles.friendName}>
        {name}
      </InkText>
    </>
  );

  if (onPress) {
    return (
      <PressableScale
        scaleTo={0.95}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? name}
        onPress={onPress}
        style={styles.friendPill}>
        {inner}
      </PressableScale>
    );
  }

  return (
    <View style={styles.friendPill} accessible accessibilityLabel={accessibilityLabel ?? name}>
      {inner}
    </View>
  );
}

export interface InkNavBarProps {
  backLabel: string;
  onBack: () => void;
  /** Fades in at the centre once scrolled past the large title. */
  title?: string;
  /** Always-visible centre content (e.g. friend identity pill); takes precedence over `title`. */
  center?: ReactNode;
  right?: ReactNode;
  scrolled?: boolean;
}

/**
 * Pinned Apple HIG navigation bar for Ink Night+ screens: 40 pt dark-glass back button on the left,
 * optional centre identity capsule or scroll-edge serif title, and trailing slot on the right.
 */
export function InkNavBar({ backLabel, onBack, title, center, right, scrolled }: InkNavBarProps) {
  return (
    <View style={[styles.bar, scrolled && styles.barScrolled]}>
      <InkIconButton icon="chevron-back" size={22} accessibilityLabel={backLabel} onPress={onBack} />

      {center ? (
        <View pointerEvents="box-none" style={styles.centerFlex}>
          {center}
        </View>
      ) : (
        <View pointerEvents="none" style={styles.centerFlex}>
          {title && scrolled ? (
            <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)}>
              <InkText variant="cardSmall" color={ink.text} lines={1} style={styles.centerTitle}>
                {title}
              </InkText>
            </Animated.View>
          ) : null}
        </View>
      )}

      <View style={styles.rightSlot}>{right ?? <View style={styles.spacer} />}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 52,
    paddingHorizontal: inkGutter,
    paddingTop: 4,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'transparent',
    zIndex: 10,
  },
  barScrolled: {
    backgroundColor: SCROLLED_BG,
    borderBottomColor: ink.edge,
  },
  circle: {
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    backgroundColor: ink.raised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_RIM,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backNudge: { marginLeft: -2 },
  centerFlex: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerTitle: { textAlign: 'center', fontSize: 17, lineHeight: 22 },
  rightSlot: {
    minWidth: BTN,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  spacer: { width: BTN, height: BTN },
  pill: {
    height: 36,
    paddingHorizontal: 13,
    borderRadius: inkRadius.pill,
    borderCurve: 'continuous',
    backgroundColor: ink.raised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_RIM,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pillText: { flexShrink: 1 },
  friendPill: {
    height: 34,
    maxWidth: '100%',
    paddingLeft: 4,
    paddingRight: 11,
    borderRadius: inkRadius.pill,
    borderCurve: 'continuous',
    backgroundColor: PILL_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_RIM,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  avatarRing: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  friendName: { flexShrink: 1 },
});
