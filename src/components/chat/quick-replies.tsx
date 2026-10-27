import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Anim, PressableScale, Txt } from '@/components/ui';
import { colors, radius, space } from '@/theme';
import type { ReplyIdea } from '@/types';

/**
 * Quick replies under the friend's line (the morning chain, reply ideas): a tap sends the idea's
 * line; a long press puts it in the field to change first (Character.AI's edit before send).
 * Outlined pills on the user's side, where the answer will land (iOS suggested replies).
 */
export function QuickReplies({
  ideas,
  onPick,
  onEdit,
}: {
  ideas: ReplyIdea[];
  onPick: (idea: ReplyIdea) => void;
  onEdit?: (idea: ReplyIdea) => void;
}) {
  const { t } = useTranslation();
  return (
    // One row that scrolls sideways when it does not fit: wrapping cut the last pill off on Android.
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.chips}>
        {ideas.map((idea) => (
          <PressableScale
            key={idea.label}
            onPress={() => onPick(idea)}
            onLongPress={onEdit ? () => onEdit(idea) : undefined}
            scaleTo={0.95}
            style={styles.chip}
            accessibilityRole="button"
            accessibilityLabel={idea.text}
            accessibilityHint={onEdit ? t('chat.ideaEditHint') : undefined}>
            <Txt style={styles.chipText} color={colors.brandText} lines={1}>
              {idea.label}
            </Txt>
          </PressableScale>
        ))}
      </ScrollView>
    </View>
  );
}

/** Plain chips (the morning chain, a character's starters) as ideas that send their own words. */
export const asIdeas = (chips: readonly string[]): ReplyIdea[] => chips.map((chip) => ({ label: chip, text: chip }));

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

/** While a scene runs in this chat: its title, and End to go back to everyday chat. */
export function SceneBar({ title, onSkip, onEnd }: { title: string; onSkip?: () => void; onEnd: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.sceneBar}>
      <Ionicons name="film-outline" size={15} color={colors.text} />
      <Txt variant="smallStrong" style={styles.flex} lines={1}>
        {title}
      </Txt>
      {/* ⏩ opens the time skip with the scene's next moment first. */}
      {onSkip ? (
        <PressableScale onPress={onSkip} scaleTo={0.9} accessibilityRole="button" accessibilityLabel={t('scenes.skipAhead')} hitSlop={10} style={styles.sceneEnd}>
          <Ionicons name="play-forward" size={17} color={colors.primary} />
        </PressableScale>
      ) : null}
      <PressableScale onPress={onEnd} scaleTo={0.94} accessibilityRole="button" accessibilityLabel={t('scenes.end')} hitSlop={10} style={styles.sceneEnd}>
        <Txt variant="smallStrong" color={colors.brandText}>
          {t('scenes.end')}
        </Txt>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sceneBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingLeft: space.lg,
    paddingRight: space.sm,
    minHeight: 44,
    backgroundColor: colors.surfaceAlt,
  },
  sceneEnd: { paddingHorizontal: space.sm, paddingVertical: space.xs },
  // flexGrow + flex-end: pills that fit sit on the right, on the user's side.
  chips: {
    flexGrow: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: space.sm,
    paddingLeft: space.xxl,
    paddingRight: space.md,
    paddingTop: space.xs,
    paddingBottom: space.sm + 2,
  },
  chip: {
    flexShrink: 0,
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
