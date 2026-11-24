import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Anim, PressableScale, Txt } from '@/components/ui';
import { useOnPhoto } from '@/components/chat/chat-ground';
import { phrase } from '@/i18n';
import { colors, palette, radius, space } from '@/theme';
import type { ReplyIdea } from '@/types';

/**
 * The answers under "May I text you?", the one choice the chat still offers as buttons: the owner
 * (2026-11-17) took every ready reply out so the user writes, and this Yes is the only way to allow
 * their pushes. A tap sends the answer's line. Outlined pills on the user's side (iOS suggested replies).
 */
export function QuickReplies({ ideas, onPick }: { ideas: ReplyIdea[]; onPick: (idea: ReplyIdea) => void }) {
  const onPhoto = useOnPhoto();
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
            scaleTo={0.95}
            style={[styles.chip, onPhoto && styles.photoChip]}
            accessibilityRole="button"
            accessibilityLabel={phrase(idea.text)}>
            <Txt style={styles.chipText} color={onPhoto ? palette.apricotCalm : colors.brandText} lines={1}>
              {phrase(idea.label)}
            </Txt>
          </PressableScale>
        ))}
      </ScrollView>
    </View>
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
          <Ionicons name="play-forward" size={17} color={colors.brandText} />
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
  // On a picture (an Art wallpaper): dark glass under a peach rim.
  photoChip: { backgroundColor: colors.onMediaBubble, borderColor: palette.apricotCalm },
  bar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm, backgroundColor: colors.primaryFill },
});
