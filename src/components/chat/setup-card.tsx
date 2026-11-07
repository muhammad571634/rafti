import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { setupUsable } from '@/ai/setup-prompt';
import { Button, PressableScale, Txt } from '@/components/ui';
import { alarmTime, repeatText } from '@/lib/alarm-format';
import { haptic } from '@/lib/haptics';
import { dateFromKey, dayKeyFromToday, todayKey } from '@/mock/time';
import { useAppStore } from '@/store/use-app-store';
import { colors, radius, shadows, space } from '@/theme';
import type { Message } from '@/types';

/**
 * The alarm or plan the friend offered to set up (`src/ai/setup-prompt.ts`), under their reply: what
 * and when, Not now / Set. Nothing exists until Set; then it reads Done and opens what was made.
 */
export function SetupCard({ message }: { message: Message }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const answerSetup = useAppStore((s) => s.answerSetup);
  const friendId = useAppStore((s) => s.conversations.find((c) => c.id === message.conversationId)?.characterId);
  const offer = message.setup;
  if (!offer || offer.declined) return null;

  const alarm = offer.kind === 'alarm';
  // A set one that a newer offer changed stands for nothing now: faded, no check.
  const made = !!offer.madeId && !offer.replaced;
  // A plan whose hour has passed, or an alarm whose day has, can no longer be set: no buttons.
  const open = !made && !offer.replaced && setupUsable(offer, new Date());
  const [hh, mm] = (offer.time ?? '').split(':').map(Number);
  const shown = offer.time ? alarmTime(hh, mm) : null;
  const clock = shown ? (shown.period ? `${shown.time} ${t(`alarms.${shown.period}`)}` : shown.time) : null;
  const day =
    alarm && offer.repeat?.length
      ? repeatText(t, offer.repeat, i18n.language)
      : offer.date === todayKey()
        ? t('common.today')
        : offer.date === dayKeyFromToday(1)
          ? t('common.tomorrow')
          : dateFromKey(offer.date).toLocaleDateString(i18n.language, { weekday: 'short', month: 'short', day: 'numeric' });
  const title = offer.title || t('alarms.defaultLabel');

  const set = () => {
    if (answerSetup(message.conversationId, message.id, true)) haptic.success();
    else haptic.error();
  };
  const no = () => {
    haptic.tap();
    answerSetup(message.conversationId, message.id, false);
  };
  const show = () => {
    if (!offer.madeId) return;
    if (alarm) router.push({ pathname: '/alarms/edit', params: { id: offer.madeId } });
    // Us on this friend and the plan's day, where the plan sits.
    else router.push({ pathname: '/(tabs)/us', params: { friend: friendId ?? '', day: offer.date, at: String(Date.now()) } });
  };

  const body = (
    <View style={styles.row}>
      <View style={[styles.icon, { backgroundColor: alarm ? colors.primarySoft : colors.primarySofter }]}>
        <Ionicons name={alarm ? 'alarm' : 'calendar'} size={22} color={colors.primary} />
      </View>
      <View style={styles.what}>
        <Txt variant="bodyStrong" numberOfLines={1}>
          {title}
        </Txt>
        <Txt variant="small" color={colors.textSecondary} numberOfLines={1} style={styles.when}>
          {[day, clock].filter(Boolean).join(' · ')}
        </Txt>
      </View>
      {made ? <Ionicons name="checkmark-circle" size={24} color={colors.success} accessibilityLabel={t('chat.setup.done')} /> : null}
    </View>
  );

  return (
    <View style={styles.wrap}>
      <View style={[styles.card, !open && !made && styles.faded]}>
        {made ? (
          <PressableScale onPress={show} accessibilityRole="button" accessibilityLabel={`${title}, ${day}${clock ? `, ${clock}` : ''}, ${t('chat.setup.done')}`}>
            {body}
          </PressableScale>
        ) : (
          body
        )}
        {open ? (
          <View style={styles.actions}>
            <Button label={t('chat.setup.notNow')} variant="soft" size="sm" onPress={no} style={styles.action} />
            <Button label={t(alarm ? 'chat.setup.set' : 'chat.setup.add')} size="sm" onPress={set} style={styles.action} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Lines up with their bubbles: past the avatar column.
  wrap: { paddingLeft: space.md + 28 + space.sm, paddingRight: space.xxl, paddingVertical: space.xs },
  card: {
    maxWidth: 320,
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  faded: { opacity: 0.55 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  what: { flex: 1 },
  when: { marginTop: 2, fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', gap: space.sm },
  action: { flex: 1 },
});
