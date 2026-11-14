import { StyleSheet } from 'react-native';

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
}

/**
 * A pick among several (design-ink §1.7, polish §2): a grey pill; a chosen one takes a faint fill, a
 * 1.5 pt ring and its label in the hue, never a white fill (white means only "the primary action").
 */
export function InkChip({ label, on, onPress, hue = ink.text }: InkChipProps) {
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
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 36,
    paddingHorizontal: 16,
    borderRadius: inkRadius.chip,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ink.raised,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
});
