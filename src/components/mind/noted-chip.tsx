import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { PressableScale, Txt } from '@/components/ui';
import { useAppStore } from '@/store/use-app-store';
import { colors, space } from '@/theme';
import type { Message } from '@/types';

import { kindOf, KIND_LOOK, whenText } from './labels';

/**
 * Under the user's message: what the friend took from it ("📌 Exam · Tomorrow 09:00", "Exam → 10:00",
 * "Exam · Went well"), read from the thread as it is now, so a change made later shows here too.
 * A tap opens the thread to fix or stop it. A thread that is gone leaves nothing.
 */
export function NotedChip({ noted, onPress }: { noted: NonNullable<Message['noted']>; onPress: (threadId: string) => void }) {
  const { t, i18n } = useTranslation();
  const thread = useAppStore((s) => s.threads.find((x) => x.id === noted.threadId));
  if (!thread) return null;
  const closed = thread.status === 'closed';
  const when = thread.happensAt ? whenText(t, i18n.language, thread.happensAt) : '';
  const label = closed
    ? `${thread.about} · ${t(`mind.outcome.${thread.outcome ?? 'done'}`)}`
    : noted.change === 'moved' && when
      ? `${thread.about} → ${when}`
      : when
        ? `${thread.about} · ${when}`
        : thread.about;
  const icon = closed ? 'checkmark-circle' : noted.change === 'moved' ? 'arrow-forward-circle' : KIND_LOOK[kindOf(thread)].icon;
  return (
    <PressableScale
      scaleTo={0.94}
      onPress={() => onPress(thread.id)}
      accessibilityRole="button"
      accessibilityLabel={`${t('mind.title')}: ${label}`}
      style={styles.chip}>
      <Ionicons name={icon} size={13} color={closed ? colors.success : colors.primary} />
      <Txt style={styles.text} color={colors.brandText} lines={1}>
        {label}
      </Txt>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-end',
    maxWidth: '72%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 24,
    marginTop: 4,
    marginRight: space.md,
    marginBottom: space.xs,
    paddingHorizontal: 9,
    borderRadius: 12,
    backgroundColor: colors.primarySofter,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primarySoft,
  },
  text: { flexShrink: 1, fontSize: 12, lineHeight: 15, fontWeight: '600', letterSpacing: -0.1 },
});
