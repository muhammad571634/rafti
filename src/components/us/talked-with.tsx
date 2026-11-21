import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { InkText } from '@/components/ink';
import { CharacterAvatar, PressableScale } from '@/components/ui';
import { useDayKey } from '@/hooks/use-day-key';
import { shortName } from '@/lib/format';
import { monthStart, talkShares, type TalkShare } from '@/lib/talk-shares';
import { displayName, useAppStore } from '@/store/use-app-store';
import { ink, inkRadius } from '@/theme/ink';
import type { Character } from '@/types';

/**
 * One bright pair per friend, by rank this month (owner, 2026-11-16: every friend, each in a colour of
 * their own). The calendar's dot for a friend uses the same colour (`talkHue`).
 */
export const TALK_HUES = [
  ['#EBAD84', '#FF9966'],
  ['#6CC4FF', '#58C7F3'],
  ['#5FE0C4', '#86E8A4'],
  ['#BF5AF2', '#E2A0FF'],
  ['#FF6EC7', '#FFA6DC'],
  ['#F8C13F', '#F08A3C'],
  ['#5E5CE6', '#9C9AFF'],
  ['#40C8E0', '#93E6F3'],
  ['#FF5E62', '#FF9966'],
  ['#30D158', '#86E8A4'],
  ['#AC8E68', '#D9C09E'],
  ['#C8D84A', '#EEF39C'],
] as const;

const MIN_DIAMETER = 48;
const MAX_DIAMETER = 74;
/** Above 4 friends, switch to horizontal scroll so portraits never crowd or clip on small screens. */
const ROW_MAX = 4;

/** This month's friends by lines, worked out again when the chats or the day change. */
export function useTalkShares(): TalkShare[] {
  const conversations = useAppStore((s) => s.conversations);
  const messages = useAppStore((s) => s.messages);
  const today = useDayKey();
  return useMemo(
    () => talkShares(conversations.map((c) => ({ conversationId: c.id, characterId: c.characterId })), messages, monthStart()),
    // `today` turns the month over at midnight on the 1st.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conversations, messages, today],
  );
}

/** A friend's colour on the circle & calendar dots, or undefined when they are not among them. */
export function talkHue(shares: readonly TalkShare[], characterId: string | undefined): string | undefined {
  const i = shares.findIndex((s) => s.characterId === characterId);
  return i >= 0 ? TALK_HUES[i % TALK_HUES.length][0] : undefined;
}

/** "12%", or "<1%" for a friend whose share rounds to nothing. */
const percentText = (percent: number) => (percent > 0 ? `${percent}%` : '<1%');

export interface TalkedWithProps {
  /** Currently selected friend on Us (gets a subtle emphasized ring). */
  selectedId?: string;
  /** Tapping a circle switches Us to that friend. */
  onSelectFriend?: (characterId: string) => void;
}

/**
 * Quiet Month Circle card at the bottom of Us (approved Ink+ prototype): calm night summary with
 * no loud yellow banner, proportional ringed friend portraits scaled by this month's share, and
 * direct tap-to-switch into any friend's bond.
 */
export const TalkedWith = memo(function TalkedWith({ selectedId, onSelectFriend }: TalkedWithProps) {
  const { t, i18n } = useTranslation();
  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);
  const shares = useTalkShares();

  if (shares.length === 0) return null;

  const characterOf = (s: TalkShare): Character | undefined => characters.find((x) => x.id === s.characterId);
  const nameOf = (s: TalkShare) => {
    const c = characterOf(s);
    return c ? shortName(displayName(c, relationships[c.id])) : '';
  };

  const top = shares[0];
  const topLines = Math.max(1, top.lines);
  const month = new Intl.DateTimeFormat(i18n.language, { month: 'long' }).format(new Date());
  const monthTitle = month.charAt(0).toLocaleUpperCase(i18n.language) + month.slice(1);
  const summary = shares.map((s) => `${nameOf(s)} ${percentText(s.percent)}`).join(', ');

  const items = shares.map((s, i) => {
    const character = characterOf(s);
    if (!character) return null;
    const name = shortName(displayName(character, relationships[character.id]));
    const ring = TALK_HUES[i % TALK_HUES.length][0];
    const ratio = Math.sqrt(Math.max(0, s.lines) / topLines);
    const size = shares.length === 1 ? MAX_DIAMETER : Math.round(MIN_DIAMETER + (MAX_DIAMETER - MIN_DIAMETER) * ratio);
    const active = s.characterId === selectedId;
    const interactive = Boolean(onSelectFriend);

    return (
      <PressableScale
        key={s.characterId}
        scaleTo={0.93}
        disabled={!interactive}
        accessibilityRole={interactive ? 'button' : undefined}
        accessibilityState={interactive ? { selected: active } : undefined}
        accessibilityLabel={`${name}, ${percentText(s.percent)}`}
        onPress={() => onSelectFriend?.(s.characterId)}
        style={styles.member}>
        <View style={[styles.ring, { borderColor: ring, borderWidth: active ? 2.5 : 2 }]}>
          <CharacterAvatar character={character} size={size} />
        </View>
        <InkText variant="caption" color={active ? ink.text : ink.text2} lines={1} style={styles.tabular}>
          {percentText(s.percent)}
        </InkText>
      </PressableScale>
    );
  });

  return (
    <View style={styles.card} accessibilityLabel={`${t('us.monthCircle', { month: monthTitle })}: ${summary}`}>
      <View style={styles.head}>
        <InkText variant="cardSmall" accessibilityRole="header" style={styles.title}>
          {t('us.monthCircle', { month: monthTitle })}
        </InkText>
        <InkText variant="footnote" color={ink.text2} style={[styles.leader, styles.tabular]}>
          {t('us.mostWith', { name: nameOf(top), percent: percentText(top.percent) })}
        </InkText>
      </View>

      {shares.length <= ROW_MAX ? (
        <View style={styles.row}>{items}</View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollRow}>
          {items}
        </ScrollView>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 14,
    marginTop: 22,
    padding: 16,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    gap: 14,
  },
  head: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    columnGap: 10,
    rowGap: 4,
  },
  title: { flexShrink: 1 },
  leader: { flexShrink: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingVertical: 2,
    gap: 8,
  },
  scrollRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 16,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  member: { alignItems: 'center', gap: 6 },
  ring: {
    padding: 2.5,
    borderRadius: inkRadius.pill,
  },
  tabular: { fontVariant: ['tabular-nums'] },
});
