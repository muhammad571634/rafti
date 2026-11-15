import { StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { haptic } from '@/lib/haptics';
import { ink, inkRadius } from '@/theme/ink';

import { InkText } from './ink-text';

export interface InkChipProps {
  label: string;
  on?: boolean;
  onPress: () => void;
  /** The ring and words of a chosen chip (a friend's hue); white by default. */
  hue?: string;
  /** A count after the label (unread chats), in a small red capsule; nothing at 0. */
  count?: number;
}

/**
 * A pick among several (design-ink §1.7, polish §2): a grey pill; a chosen one takes a faint fill, a
 * 1.5 pt ring and its label in the hue, never a white fill (white means only "the primary action").
 */
export function InkChip({ label, on, onPress, hue = ink.text, count = 0 }: InkChipProps) {
  return (
    <PressableScale
      scaleTo={0.95}
      accessibilityRole="button"
      accessibilityState={{ selected: !!on }}
      onPress={() => {
        if (!on) haptic.selection();
        onPress();
      }}
      style={[styles.chip, on && { borderColor: hue, backgroundColor: `${hue}1F` }]}>
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
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ink.raised,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  count: { minWidth: 20, paddingHorizontal: 6, borderRadius: inkRadius.pill, alignItems: 'center', backgroundColor: ink.danger },
});
