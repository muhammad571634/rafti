import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { haptic } from '@/lib/haptics';
import { ink, inkPeachGlass, inkRadius } from '@/theme/ink';

import { InkText } from './ink-text';

export interface InkChipProps {
  label: string;
  on?: boolean;
  onPress: () => void;
  /** The ring and words of a chosen chip (a friend's hue); peach glass by default. */
  hue?: string;
  /** A count after the label (unread chats), in a small red capsule; nothing at 0. */
  count?: number;
}

/**
 * A pick among several (design-ink §1.7, polish §2): a grey pill; a chosen brand-peach chip takes
 * the Tab Bar's Liquid Peach Glass wash and rim, while a friend-hued chip keeps its friend colour.
 */
export function InkChip({ label, on, onPress, hue = ink.accent, count = 0 }: InkChipProps) {
  const isPeach = hue === ink.accent;
  return (
    <PressableScale
      scaleTo={0.95}
      accessibilityRole="button"
      accessibilityState={{ selected: !!on }}
      onPress={() => {
        if (!on) haptic.selection();
        onPress();
      }}
      style={[
        styles.chip,
        on && (isPeach ? styles.peachOn : { borderWidth: 1.5, borderColor: hue, backgroundColor: `${hue}1F` }),
      ]}>
      {on && isPeach ? <LinearGradient colors={inkPeachGlass.fill} style={StyleSheet.absoluteFill} pointerEvents="none" /> : null}
      <InkText variant={on ? 'subStrong' : 'sub'} color={on ? hue : ink.text} lines={1}>
        {label}
      </InkText>
      {count > 0 ? (
        <View style={styles.count}>
          <InkText variant="caption" color={ink.text}>
            {count > 99 ? '99+' : count}
          </InkText>
        </View>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 36,
    paddingHorizontal: 16,
    borderRadius: inkRadius.chip,
    overflow: 'hidden',
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ink.raised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  peachOn: {
    backgroundColor: 'transparent',
    borderWidth: 0.75,
    borderColor: inkPeachGlass.rim,
  },
  count: { minWidth: 20, paddingHorizontal: 6, borderRadius: inkRadius.pill, alignItems: 'center', backgroundColor: ink.danger },
});
