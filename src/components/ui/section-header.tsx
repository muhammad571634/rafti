import { Ionicons } from '@expo/vector-icons';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, space } from '@/theme';

import { PressableScale } from './pressable-scale';
import { Txt } from './text';

export interface SectionHeaderProps {
  title: string;
  /** Renders the chevron affordance used on the Find screen groups. */
  onPress?: () => void;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function SectionHeader({ title, onPress, right, style }: SectionHeaderProps) {
  const body = (
    <View style={[styles.base, style]}>
      <Txt variant="h3" lines={1} style={styles.title}>
        {title}
      </Txt>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={20} color={colors.textFaint} /> : null)}
    </View>
  );

  if (!onPress) return body;

  return (
    <PressableScale onPress={onPress} scaleTo={0.99} dimOnPress={false}>
      {body}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  title: { flexShrink: 1 },
});
