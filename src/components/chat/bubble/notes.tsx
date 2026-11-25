import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View } from 'react-native';

import { HELPLINE_URL } from '@/ai/safety';
import { AgeConfirmSheet } from '@/components/age-confirm-sheet';
import { useOnPhoto } from '@/components/chat/chat-ground';
import { planDate } from '@/components/plans/copy';
import { Button, PressableScale, Txt } from '@/components/ui';
import { ageDoubt } from '@/lib/age-check';
import { clockTime, duration as fmtDuration } from '@/lib/format';
import { useAppStore } from '@/store/use-app-store';
import { colors, palette, radius, shadows, space } from '@/theme';
import { inkRadius } from '@/theme/ink';
import type { Message, WeekStats } from '@/types';

import { AVATAR, bubbleStyles } from './styles';

/** System lines are plain grey text between the bubbles, as in iOS Messages. */
export function SystemLine({ text }: { text: string }) {
  const onPhoto = useOnPhoto();
  return (
    <View style={styles.system}>
      <Txt style={[styles.systemText, onPhoto && styles.photoSystem]} center>
        {text}
      </Txt>
    </View>
  );
}

/**
 * A note the user pinned for this friend on the board, on the user's side of the chat (0z138): what
 * the friend's answer below it is about. A tap opens the board.
 */
export function BoardNoteLine({ text }: { text: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <View style={styles.boardWrap}>
      <PressableScale
        onPress={() => router.push('/board')}
        accessibilityRole="button"
        accessibilityLabel={`${t('board.title')}: ${text}`}
        style={styles.boardNote}>
        <Ionicons name="pin" size={16} color={palette.apricotCalm} style={styles.boardPin} />
        <Txt style={styles.boardText} lines={4}>
          {text}
        </Txt>
      </PressableScale>
    </View>
  );
}

/** Where the story moved on (a time skip): the new time, centred like the chat's own notes. */
export function SkipLine({ text, icon = 'time-outline' }: { text: string; icon?: keyof typeof Ionicons.glyphMap }) {
  const onPhoto = useOnPhoto();
  return (
    <View style={styles.system} accessibilityRole="header">
      <View style={styles.sceneHead}>
        <Ionicons name={icon} size={16} color={onPhoto ? colors.onMediaSoft : colors.textSecondary} />
        <Txt style={[styles.systemText, styles.systemStrong, onPhoto && styles.photoSystem]}>{text}</Txt>
      </View>
    </View>
  );
}

/**
 * Where a scene starts in the chat, kept quiet (owner's "chat calm" pick, 0z269): a small capsule
 * with its title and the first line of its set-up; a tap opens the whole set-up, another closes it.
 */
export function SceneCard({ title, setting }: { title: string; setting?: string }) {
  const onPhoto = useOnPhoto();
  const [open, setOpen] = useState(false);
  const body = setting?.trim();
  const soft = onPhoto ? colors.onMediaMuted : colors.textSecondary;
  const chevron = <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={13} color={soft} />;
  return (
    <View style={styles.system} accessibilityRole="header">
      <PressableScale
        scaleTo={0.97}
        disabled={!body}
        onPress={() => setOpen((was) => !was)}
        accessibilityRole="button"
        accessibilityLabel={body ? `${title}. ${body}` : title}
        accessibilityState={body ? { expanded: open } : undefined}
        style={[styles.sceneCard, onPhoto ? styles.sceneOnPhoto : styles.scenePlain]}>
        <View style={styles.sceneHead}>
          <Ionicons name="film-outline" size={15} color={onPhoto ? colors.onMediaSoft : colors.textSecondary} />
          <Txt style={[styles.sceneTitle, onPhoto && styles.sceneTitlePhoto]}>{title}</Txt>
        </View>
        {body ? (
          // Closed: one line and a chevron beside it; open: the whole set-up, the chevron under it.
          <View style={open ? styles.sceneBodyOpen : styles.sceneBody}>
            <Txt style={[styles.sceneSetting, { color: soft }]} center lines={open ? undefined : 1}>
              {body}
            </Txt>
            {chevron}
          </View>
        ) : null}
      </PressableScale>
    </View>
  );
}

/**
 * The Sunday recap's numbers (`src/lib/week.ts`), above the friend's line: a calm card of icons and
 * numbers (days together, messages, wins, shared diary pages); the words are in their text.
 */
export function WeekCard({ week }: { week: WeekStats }) {
  const { t } = useTranslation();
  const stats: { icon: React.ComponentProps<typeof Ionicons>['name']; value: string; label: string }[] = [
    { icon: 'calendar-outline', value: `${week.days}/7`, label: t('chat.week.days', { count: week.days }) },
    { icon: 'chatbubbles-outline', value: String(week.messages), label: t('chat.week.messages', { count: week.messages }) },
    { icon: 'trophy-outline', value: String(week.winCount + week.quests), label: t('chat.week.wins', { count: week.winCount + week.quests }) },
    { icon: 'book-outline', value: String(week.pages), label: t('chat.week.pages', { count: week.pages }) },
  ];
  return (
    <View style={styles.system}>
      <View style={styles.weekCard} accessibilityRole="summary" accessibilityLabel={[t('chat.week.title'), ...stats.map((x) => x.label)].join(', ')}>
        <View style={styles.sceneHead}>
          <Ionicons name="sparkles-outline" size={16} color={colors.textSecondary} />
          <Txt style={[styles.systemText, styles.systemStrong]}>{t('chat.week.title')}</Txt>
        </View>
        <View style={styles.weekRow}>
          {stats.map((x) => (
            <View key={x.icon} style={styles.weekStat}>
              <Ionicons name={x.icon} size={20} color={colors.brandText} />
              <Txt style={styles.weekValue}>{x.value}</Txt>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/** A group's "Kai & Mia are AI characters, not real people." At a session's start and every 3 hours. */
export function AiNotice({ text }: { text: string }) {
  const onPhoto = useOnPhoto();
  return (
    <View style={styles.system}>
      <Txt style={[styles.systemText, onPhoto && styles.photoSystem]} center>
        {text}
      </Txt>
    </View>
  );
}

/** Under a text-only reply when a member's voice minutes ran out; once a day. */
export function VoiceQuotaNote({ until }: { until?: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const onPhoto = useOnPhoto();
  return (
    <View style={styles.quota}>
      <Ionicons name="mic-off-outline" size={17} color={onPhoto ? colors.onMediaSoft : colors.textSecondary} style={styles.quotaIcon} />
      <Txt variant="small" color={onPhoto ? colors.onMediaSoft : colors.textSecondary} style={[styles.quotaText, onPhoto && bubbleStyles.photoShadow]}>
        {t('chat.voiceQuota', { date: until ? planDate(Date.parse(until)) : '' })}{' '}
        <Txt variant="smallStrong" color={onPhoto ? colors.onMedia : colors.text} onPress={() => router.push('/my-plan')} accessibilityRole="link">
          {t('chat.addMinutes')}
        </Txt>
      </Txt>
    </View>
  );
}

/** "Yes, text me!" while the phone blocks pushes: their texts cannot reach the lock screen yet. */
export function NotifyOffNote({ name }: { name: string }) {
  const { t } = useTranslation();
  const onPhoto = useOnPhoto();
  return (
    <View style={styles.quota}>
      <Ionicons name="notifications-off-outline" size={17} color={onPhoto ? colors.onMediaSoft : colors.textSecondary} style={styles.quotaIcon} />
      <Txt variant="small" color={onPhoto ? colors.onMediaSoft : colors.textSecondary} style={[styles.quotaText, onPhoto && bubbleStyles.photoShadow]}>
        {t('chat.notifyOff', { name })}{' '}
        <Txt variant="smallStrong" color={onPhoto ? colors.onMedia : colors.text} onPress={() => void Linking.openSettings()} accessibilityRole="link">
          {t('chat.notifyOffAction')}
        </Txt>
      </Txt>
    </View>
  );
}

/** Shown under a crisis message: never blocks the chat, one tap to local helplines. */
export function HelplineCard() {
  const { t } = useTranslation();
  return (
    <View style={styles.system}>
      <View style={styles.helpline}>
        <Txt variant="title" center>
          {t('safety.helplineTitle')}
        </Txt>
        <Button
          label={t('safety.helplineAction')}
          variant="secondary"
          size="sm"
          onPress={() => void Linking.openURL(HELPLINE_URL)}
        />
      </View>
    </View>
  );
}

/**
 * Where a chat said the user may be under 18 (src/lib/age-check.ts): every character is careful now;
 * Confirm age opens the year wheel. Once confirmed it says so; a year under 18 keeps it for good.
 */
export function AgeCheckCard() {
  const { t } = useTranslation();
  const doubt = useAppStore((s) => ageDoubt(s.user));
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.system}>
      <View style={styles.helpline}>
        <Txt variant="title" center>
          {doubt ? t('ageCheck.title') : t('ageCheck.confirmed')}
        </Txt>
        {doubt === 'locked' ? (
          <Txt center style={styles.systemText}>
            {t('ageCheck.locked')}
          </Txt>
        ) : doubt ? (
          <Button label={t('ageCheck.confirm')} variant="secondary" size="sm" onPress={() => setOpen(true)} />
        ) : null}
      </View>
      <AgeConfirmSheet visible={open} onClose={() => setOpen(false)} />
    </View>
  );
}

export function CallLine({ message, onCallBack }: { message: Message; onCallBack?: () => void }) {
  const { t } = useTranslation();
  const onPhoto = useOnPhoto();
  const missed = !!message.missed;
  const quiet = onPhoto ? colors.onMediaSoft : colors.textSecondary;

  return (
    <View style={styles.system}>
      <PressableScale style={styles.callLine} onPress={onCallBack} disabled={!onCallBack} scaleTo={0.96}>
        <Ionicons name={missed ? 'call-outline' : 'call'} size={15} color={missed ? colors.danger : quiet} />
        {/* The colour goes in the style: `Txt` lays `style` over its `color`. */}
        <Txt style={[styles.systemText, { color: missed ? colors.danger : quiet }, onPhoto && bubbleStyles.photoShadow]}>
          {missed ? t('chat.callMissed') : t('chat.callDuration', { duration: fmtDuration(message.durationSec ?? 0) })}
        </Txt>
        {missed && onCallBack ? (
          <Txt style={[styles.systemText, styles.systemStrong, { color: onPhoto ? palette.apricotCalm : colors.brandText }]}>
            {' · '}
            {t('chat.callBack')}
          </Txt>
        ) : null}
        <Txt style={[styles.systemText, onPhoto && styles.photoSystem]}>
          {'  '}
          {clockTime(message.createdAt)}
        </Txt>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  photoSystem: { color: colors.onMediaSoft, textShadowColor: colors.onMediaShadow, textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  system: { alignItems: 'center', paddingVertical: space.sm + 2, paddingHorizontal: space.xxl },
  systemText: { fontSize: 12, lineHeight: 16, color: colors.textSecondary },
  systemStrong: { fontWeight: '600' },
  boardWrap: { alignItems: 'flex-end', paddingHorizontal: space.md, paddingVertical: space.xs },
  boardNote: {
    maxWidth: '78%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.xs,
    paddingVertical: space.sm + 2,
    paddingHorizontal: space.md,
    borderRadius: 18,
    backgroundColor: '#EFE8FF',
    transform: [{ rotate: '-1.5deg' }],
    ...shadows.card,
  },
  boardPin: { marginTop: 2 },
  boardText: { flexShrink: 1, fontSize: 15, lineHeight: 20, color: '#2B2350' },
  sceneHead: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  sceneCard: {
    maxWidth: 300,
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 14,
    paddingTop: space.sm,
    paddingBottom: 9,
    borderRadius: inkRadius.chip,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  // A quiet dark glass on the picture, lighter than a bubble's, so it reads as a note, not a line.
  sceneOnPhoto: { backgroundColor: colors.onMediaField, borderColor: colors.onMediaRim },
  scenePlain: { backgroundColor: colors.surfaceAlt, borderColor: colors.borderStrong },
  sceneTitle: { flexShrink: 1, fontSize: 13, lineHeight: 17, fontWeight: '600', color: colors.text, textAlign: 'center' },
  sceneTitlePhoto: { color: colors.onMediaSoft },
  sceneBody: { flexDirection: 'row', alignItems: 'center', gap: space.xs, maxWidth: '100%' },
  sceneBodyOpen: { alignItems: 'center', gap: 2 },
  sceneSetting: { flexShrink: 1, fontSize: 13, lineHeight: 18, fontStyle: 'italic' },
  weekCard: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  weekRow: { flexDirection: 'row', alignSelf: 'stretch', justifyContent: 'space-around' },
  weekStat: { alignItems: 'center', gap: 4, minWidth: 56 },
  weekValue: { fontSize: 17, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  callLine: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  // Lines up with their bubbles: past the avatar column.
  quota: {
    flexDirection: 'row',
    gap: space.xs + 2,
    paddingLeft: space.md + AVATAR + space.sm,
    paddingRight: space.xxl,
    paddingVertical: space.xs,
  },
  quotaIcon: { marginTop: 2 },
  quotaText: { flex: 1 },
  helpline: {
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: space.xl,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
