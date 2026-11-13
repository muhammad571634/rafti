import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { CharacterAvatar, Sheet, Txt } from '@/components/ui';
import { confirmAction } from '@/lib/confirm';
import { clockTime, shortName } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { reminderAt } from '@/lib/schedule';
import { dateFromKey, dayKeyFromToday, todayKey } from '@/mock/time';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, space } from '@/theme';

/**
 * A plan set from the chat, opened over the chat (0z143): who, which day and hour, when the reminder
 * comes, and two ways out: Us (the plan in its place) or Delete. Before, the Done card switched to
 * the Us tab, and Back then landed on Today instead of the chat it was opened from.
 */
export function PlanDetailSheet({ planId, onClose }: { planId: string | null; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const plan = useAppStore((s) => (planId ? s.schedules.find((x) => x.id === planId) : undefined));
  const character = useAppStore((s) => s.characters.find((c) => c.id === plan?.characterId));
  const relationship = useAppStore((s) => (plan ? s.relationships[plan.characterId] : undefined));
  const removeSchedule = useAppStore((s) => s.removeSchedule);

  const visible = !!plan && !!character;
  const day = !plan
    ? ''
    : plan.date === todayKey()
      ? t('common.today')
      : plan.date === dayKeyFromToday(1)
        ? t('common.tomorrow')
        : dateFromKey(plan.date).toLocaleDateString(i18n.language, { weekday: 'short', month: 'short', day: 'numeric' });
  const remind = plan && plan.time && !plan.reminded ? reminderAt(plan) : null;
  const remindAhead = !!remind && remind.getTime() > Date.now();

  const showOnUs = () => {
    if (!plan) return;
    haptic.tap();
    onClose();
    router.push({ pathname: '/(tabs)/us', params: { friend: plan.characterId, day: plan.date, at: String(Date.now()) } });
  };

  const remove = () => {
    if (!plan) return;
    confirmAction({
      title: plan.title,
      action: t('common.delete'),
      cancel: t('common.cancel'),
      onConfirm: () => {
        haptic.success();
        // The friend sees it is off and asks what happened (0z139).
        removeSchedule(plan.id);
        onClose();
      },
    });
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={plan?.title}>
      {plan && character ? (
        <>
          <View style={styles.group}>
            <View style={[styles.row, styles.line]}>
              <CharacterAvatar character={character} size={28} />
              <Txt style={[styles.label, styles.grow]} lines={1}>
                {shortName(displayName(character, relationship))}
              </Txt>
            </View>
            <View style={[styles.row, remindAhead && styles.line]}>
              <Ionicons name="calendar" size={20} color={colors.brandText} />
              <Txt style={[styles.label, styles.grow]}>{day}</Txt>
              {plan.time ? <Txt style={styles.clock}>{plan.time}</Txt> : null}
            </View>
            {remindAhead && remind ? (
              <View style={styles.row}>
                <Ionicons name="notifications" size={20} color={colors.textSecondary} />
                <Txt style={[styles.label, styles.grow]} color={colors.textSecondary}>
                  {clockTime(remind.toISOString())}
                </Txt>
              </View>
            ) : null}
          </View>

          <View style={[styles.group, styles.gapLarge]}>
            <Pressable onPress={showOnUs} accessibilityRole="button" style={({ pressed }) => [styles.row, styles.line, pressed && styles.pressed]}>
              <Ionicons name="heart" size={20} color={colors.brandText} />
              <Txt style={[styles.label, styles.grow]} color={colors.brandText}>
                {t('tabs.us')}
              </Txt>
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </Pressable>
            <Pressable onPress={remove} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
              <Txt style={styles.label} color={colors.danger}>
                {t('common.delete')}
              </Txt>
            </Pressable>
          </View>
        </>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  // iOS inset groups on the white sheet, as Keeping in mind's thread sheet.
  group: { borderRadius: 14, backgroundColor: colors.bg, overflow: 'hidden' },
  gapLarge: { marginTop: 22 },
  grow: { flex: 1 },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: space.sm + 2, paddingHorizontal: space.lg },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  pressed: { backgroundColor: colors.surfaceAlt },
  label: { fontSize: 17, letterSpacing: -0.4 },
  clock: { fontSize: 17, fontWeight: '600', letterSpacing: -0.4, fontVariant: ['tabular-nums'], color: colors.text },
});
