import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { Sheet, Txt } from '@/components/ui';
import { relativeStamp, shortName } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { reachReason, reasonThreadId, type ReachReason } from '@/lib/mind';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, space, systemColors } from '@/theme';
import type { Character, Message, Thread } from '@/types';

import { kindOf, KIND_LOOK } from './labels';

type IoniconName = keyof typeof Ionicons.glyphMap;

/** The glyph and tile colour for a reason. */
function lookOf(reason: ReachReason, thread?: Thread): { icon: IoniconName; fill: string } {
  switch (reason.source) {
    case 'thread':
    case 'quest':
      return thread ? KIND_LOOK[kindOf(thread)] : KIND_LOOK.quest;
    case 'lead':
      return { icon: 'alarm', fill: systemColors.orange };
    case 'care':
      return { icon: 'heart', fill: systemColors.pink };
    case 'life':
    case 'hello':
      return { icon: 'home', fill: systemColors.teal };
    case 'ask':
      return { icon: 'chatbubble-ellipses', fill: systemColors.blue };
    case 'pause':
      return reason.why === 'night' ? { icon: 'moon', fill: systemColors.indigo } : { icon: 'cafe', fill: systemColors.brown };
  }
}

/**
 * "Why did they write?" (A3): held on a line a friend wrote first, the menu's Why? says what
 * started it (your exam, your headache, the family's lunchtime, a late night), with your words
 * when there were some, a way into the thread, and Let them reach out to stop it all.
 */
export function WhySheet({
  message,
  character,
  onClose,
  onOpenThread,
}: {
  message: Message | null;
  character: Character;
  onClose: () => void;
  onOpenThread: (threadId: string) => void;
}) {
  const { t } = useTranslation();
  const reason = reachReason(message?.reach);
  const threadId = reasonThreadId(reason);
  const leadPlan = reason?.source === 'lead' ? reason.scheduleId : undefined;
  const thread = useAppStore((s) =>
    threadId ? s.threads.find((x) => x.id === threadId) : leadPlan ? s.threads.find((x) => x.scheduleId === leadPlan) : undefined,
  );
  const plan = useAppStore((s) => (leadPlan ? s.schedules.find((x) => x.id === leadPlan) : undefined));
  // The check-in's own words: the latest such worry of theirs before this line.
  const care = useAppStore((s) =>
    reason?.source === 'care' && message
      ? s.care.findLast((c) => c.characterId === character.id && c.kind === reason.kind && c.createdAt <= message.createdAt)
      : undefined,
  );
  const relationship = useAppStore((s) => s.relationships[character.id]);
  const setCharacterPref = useAppStore((s) => s.setCharacterPref);
  const name = shortName(displayName(character, relationship));

  if (!message || !reason) return <Sheet visible={false} onClose={onClose}>{null}</Sheet>;

  const about = thread?.about ?? plan?.title ?? '';
  const heading =
    reason.source === 'thread'
      ? t(`why.thread.${reason.phase}`, { about })
      : reason.source === 'quest'
        ? t('why.quest')
        : reason.source === 'lead'
          ? t('why.lead', { about })
          : reason.source === 'care'
            ? t(`why.care.${reason.kind}`)
            : reason.source === 'life'
              ? t(`why.life.${reason.moment}`)
              : reason.source === 'hello'
                ? t('why.hello')
                : reason.source === 'ask'
                  ? t('why.ask')
                  : t(`why.pause.${reason.why}`);
  const quote = thread?.quote ?? care?.quote;
  const said = thread?.createdAt ?? care?.createdAt;
  const look = lookOf(reason, thread);
  const openable = thread && (reason.source === 'thread' || reason.source === 'quest' || reason.source === 'lead');

  return (
    <Sheet visible onClose={onClose} title={t('why.title', { name })}>
      <View style={styles.group}>
        <View style={styles.head}>
          <View style={[styles.tile, { backgroundColor: look.fill }]}>
            <Ionicons name={look.icon} size={17} color={colors.white} />
          </View>
          <Txt style={[styles.label, styles.grow]} lines={2}>
            {heading}
          </Txt>
        </View>
        {quote ? (
          <View style={styles.quoteBox}>
            <Txt style={styles.small} color={colors.textSecondary}>
              {t('mind.youSaid')}
              {said ? ` · ${relativeStamp(said)}` : ''}
            </Txt>
            <Txt style={styles.quote}>“{quote}”</Txt>
          </View>
        ) : null}
        {openable ? (
          <Pressable
            onPress={() => onOpenThread(thread.id)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.row, styles.lineTop, pressed && styles.pressed]}>
            <Txt style={[styles.label, styles.grow]} color={colors.brandText}>
              {t('mind.title')}
            </Txt>
            <Ionicons name="chevron-forward" size={15} color={colors.textFaint} />
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.group, styles.gap]}>
        <View style={styles.row}>
          <Txt style={[styles.label, styles.grow]}>{t('characterSettings.messagesFirst')}</Txt>
          <Switch
            value={!!relationship?.messagesFirst}
            onValueChange={(on) => {
              haptic.toggle(on);
              setCharacterPref(character.id, 'messagesFirst', on);
            }}
            accessibilityLabel={t('characterSettings.messagesFirst')}
            trackColor={{ true: colors.success }}
            ios_backgroundColor={colors.surfaceAlt}
          />
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  group: { borderRadius: 14, backgroundColor: colors.bg, overflow: 'hidden' },
  gap: { marginTop: 22 },
  grow: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  tile: { width: 30, height: 30, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  quoteBox: { paddingHorizontal: space.lg, paddingBottom: space.md, gap: 4 },
  small: { fontSize: 13 },
  quote: { fontSize: 17, lineHeight: 23, letterSpacing: -0.4, color: colors.text },
  row: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm + 2, paddingHorizontal: space.lg },
  lineTop: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderStrong },
  pressed: { backgroundColor: colors.surfaceAlt },
  label: { fontSize: 17, letterSpacing: -0.4 },
});
