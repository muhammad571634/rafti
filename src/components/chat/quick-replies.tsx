import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Anim, PressableScale, Txt } from '@/components/ui';
import { colors, radius, space } from '@/theme';

/** Quick replies under the friend's line (the morning chain): a tap sends it, free. */
export function QuickReplies({ chips, onPick }: { chips: string[]; onPick: (chip: string) => void }) {
  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.chips}>
      {chips.map((chip) => (
        <PressableScale key={chip} onPress={() => onPick(chip)} scaleTo={0.95} style={styles.chip} accessibilityRole="button">
          <Txt variant="smallStrong">{chip}</Txt>
        </PressableScale>
      ))}
    </Animated.View>
  );
}

/** The peach bar while the wake-up alarm rings in this chat: a real reply turns it off. */
export function AlarmBar() {
  const { t } = useTranslation();
  return (
    <View style={styles.bar} accessibilityRole="alert">
      <Txt variant="smallStrong" color={colors.textOnPrimary} style={styles.flex}>
        {`⏰ ${t('alarms.ringBar')}`}
      </Txt>
      <Anim name="voiceWave" size={22} tint={colors.textOnPrimary} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingLeft: 34 + space.sm + space.lg, paddingRight: space.lg, paddingTop: space.xs, paddingBottom: space.sm },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm - 1,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  bar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm, backgroundColor: colors.primaryFill },
});
