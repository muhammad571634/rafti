import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { ink, inkRadius, inkTints } from '@/theme/ink';

import { InkText } from './ink-text';

export interface TileProps {
  /** A wash from `inkTints` (or a pair of its own). */
  tint: readonly [string, string];
  name: string;
  /** The line at the bottom: rounds and price, a count, "Reach level 6". */
  meta?: React.ReactNode;
  /** Ringed: the one chosen in a pick-one grid. */
  picked?: boolean;
  /** Not open yet: the name fades. */
  dimmed?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  accessibilityLabel?: string;
}

/**
 * A square on a shelf (design-ink §1.9): two a row, a soft deep tint, the name in serif, a short line
 * at the bottom. Dates, world books, Find's circles.
 */
export function Tile({ tint, name, meta, picked, dimmed, onPress, onLongPress, accessibilityLabel }: TileProps) {
  return (
    <PressableScale
      scaleTo={0.96}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? name}
      accessibilityState={{ selected: !!picked }}
      style={[styles.wrap, picked && styles.picked]}>
      <LinearGradient colors={tint} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.tile}>
        <InkText variant="cardSmall" center lines={3} style={dimmed && styles.dimmed} adjustsFontSizeToFit minimumFontScale={0.75}>
          {name}
        </InkText>
        {meta ? <View style={styles.meta}>{meta}</View> : null}
      </LinearGradient>
    </PressableScale>
  );
}

/** The tint for the nth tile, in turn. */
export const tileTint = (index: number) => inkTints[index % inkTints.length];

const styles = StyleSheet.create({
  // Two a row with a 12 pt gap; the ring sits 3 pt outside the tile.
  wrap: { width: '47.5%', aspectRatio: 1, borderRadius: inkRadius.tile + 2, borderCurve: 'continuous', padding: 3, borderWidth: 2, borderColor: 'transparent' },
  picked: { borderColor: ink.text },
  tile: { flex: 1, borderRadius: inkRadius.tile - 2, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  dimmed: { opacity: 0.6 },
  meta: { position: 'absolute', bottom: 14, left: 10, right: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
});
