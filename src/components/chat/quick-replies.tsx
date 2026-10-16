import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Anim, PressableScale, Txt } from '@/components/ui';
import { colors, radius, space } from '@/theme';

/**
 * Quick replies under the friend's line (the morning chain): a tap sends it, free. Outlined
 * pills on the user's side, where the answer will land (iOS suggested replies).
 */
export function QuickReplies({ chips, onPick }: { chips: string[]; onPick: (chip: string) => void }) {
  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.chips}>
      {chips.map((chip) => (
        <PressableScale key={chip} onPress={() => onPick(chip)} scaleTo={0.95} style={styles.chip} accessibilityRole="button">
          <Txt style={styles.chipText} color={colors.primary}>
            {chip}
          </Txt>
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: space.sm,
    paddingLeft: space.xxl,
    paddingRight: space.md,
    paddingTop: space.xs,
    paddingBottom: space.sm + 2,
  },
  chip: {
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  chipText: { fontSize: 15, fontWeight: '500', letterSpacing: -0.2 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm, backgroundColor: colors.primaryFill },
});
