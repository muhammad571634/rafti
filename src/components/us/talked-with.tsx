import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';

import { useDayKey } from '@/hooks/use-day-key';
import { packBubbles, type Bubble } from '@/lib/bubble-pack';
import { shortName } from '@/lib/format';
import { monthStart, talkShares, type TalkShare } from '@/lib/talk-shares';
import { displayName, useAppStore } from '@/store/use-app-store';
import { ink, inkFace, inkRadius, inkType } from '@/theme/ink';

/**
 * One bright pair per friend, by rank this month (owner, 2026-11-16: every friend, each in a colour of
 * their own). Not the friend's own hue: friend hues are muted and two friends can draw the same one,
 * and the bubbles must tell them apart. Apple's system colours on dark, each washed to a lighter stop;
 * twelve, one for each of the cast. The calendar's dot for a friend uses the same colour (`talkHue`).
 */
export const TALK_HUES = [
  ['#FF5E62', '#FF9966'],
  ['#F8C13F', '#F08A3C'],
  ['#6E8BFF', '#58C7F3'],
  ['#30D158', '#86E8A4'],
  ['#BF5AF2', '#E2A0FF'],
  ['#FF6EC7', '#FFA6DC'],
  ['#40C8E0', '#93E6F3'],
  ['#5E5CE6', '#9C9AFF'],
  ['#63E6BE', '#B6F4DF'],
  ['#FF9F0A', '#FFC970'],
  ['#AC8E68', '#D9C09E'],
  ['#C8D84A', '#EEF39C'],
] as const;

const SWELL_MS = 800;
const STAGGER_MS = 60;
// A quick rise that overshoots a touch and settles.
const SWELL = Easing.bezier(0.2, 1.3, 0.4, 1);
const MOVE = { damping: 18, stiffness: 160, mass: 1 } as const;
/** Points between two bubbles, and the smallest a bubble may be: room for a short name and its percent. */
const GAP = 4;
const MIN_R = 27;

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

/** A friend's colour on the bubbles, or undefined when they are not among them. */
export function talkHue(shares: readonly TalkShare[], characterId: string | undefined): string | undefined {
  const i = shares.findIndex((s) => s.characterId === characterId);
  return i >= 0 ? TALK_HUES[i % TALK_HUES.length][0] : undefined;
}

/** The bubbles' box grows a little with the number of friends, so a dozen stay readable. */
const boxHeight = (count: number) => (count <= 3 ? 172 : count <= 6 ? 210 : count <= 9 ? 240 : 268);

/** "12%", or "<1%" for a friend whose share rounds to nothing. */
const percentText = (percent: number) => (percent > 0 ? `${percent}%` : '<1%');

/** Dark words on a light bubble, white on a deep one (WCAG relative luminance of its first stop). */
function inkOn(hex: string): string {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] > 0.3 ? 'rgba(0,0,0,0.86)' : '#FFFFFF';
}

/**
 * "Who you talked with" as one card (owner, 2026-11-16): the month in serif, then a bubble for every
 * friend talked with this month, packed edge to edge in the card (`packBubbles`), each in a colour of
 * their own and sized by their share of this month's lines, the name and percent inside (HIG Charts:
 * label the marks directly; no legend, owner 2026-11-16). The bubbles swell in
 * one after another when the card first appears and glide when the shares change; reduced motion
 * shows them at once. Hidden until two friends have talked this month.
 */
export const TalkedWith = memo(function TalkedWith() {
  const { t, i18n } = useTranslation();
  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);
  const shares = useTalkShares();
  const [width, setWidth] = useState(0);
  const height = boxHeight(shares.length);

  const bubbles = useMemo(
    () => packBubbles(shares.map((s) => s.lines), width, height, GAP, MIN_R),
    [shares, width, height],
  );

  if (shares.length === 0) return null;

  const nameOf = (s: TalkShare) => {
    const c = characters.find((x) => x.id === s.characterId);
    return c ? shortName(displayName(c, relationships[c.id])) : '';
  };
  const month = new Intl.DateTimeFormat(i18n.language, { month: 'long' }).format(new Date());
  const monthTitle = month.charAt(0).toLocaleUpperCase(i18n.language) + month.slice(1);
  const summary = shares.map((s) => `${nameOf(s)} ${percentText(s.percent)}`).join(', ');

  return (
    <View style={styles.card}>
      <Text style={styles.month} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
        {monthTitle}
      </Text>
      <Text style={styles.subtitle} maxFontSizeMultiplier={1.3}>
        {t('us.whoTalked')}
      </Text>
      <View
        style={[styles.box, { height }]}
        onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}
        accessible
        accessibilityLabel={`${monthTitle}, ${t('us.whoTalked')}: ${summary}`}>
        {bubbles.map((b, i) => (
          <TalkBubble key={shares[i].characterId} index={i} bubble={b} hue={TALK_HUES[i % TALK_HUES.length]} name={nameOf(shares[i])} percent={shares[i].percent} />
        ))}
      </View>
    </View>
  );
});

/**
 * How a bubble carries its words (owner, 2026-11-16: names and percents inside the bubbles only): the
 * name at 15 pt when it fits the bubble's middle, else at 12 pt, else only the percent (a very long
 * name in a small bubble). Widths are estimated per character of the face.
 */
type LabelSize = 'big' | 'small' | 'percent';
function labelSize(name: string, r: number): LabelSize {
  const room = r * 1.62;
  if (r >= 36 && name.length * 8.6 <= room) return 'big';
  if (name.length * 6.9 <= room) return 'small';
  return 'percent';
}

const TalkBubble = memo(function TalkBubble({ index, bubble, hue, name, percent }: { index: number; bubble: Bubble; hue: readonly [string, string]; name: string; percent: number }) {
  const swell = useSharedValue(0);
  const x = useSharedValue(bubble.x);
  const y = useSharedValue(bubble.y);
  const r = useSharedValue(bubble.r);

  useEffect(() => {
    swell.set(withDelay(index * STAGGER_MS, withTiming(1, { duration: SWELL_MS, easing: SWELL })));
    // Once, when the bubble first appears; later its place glides (below).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    x.set(withSpring(bubble.x, MOVE));
    y.set(withSpring(bubble.y, MOVE));
    r.set(withSpring(bubble.r, MOVE));
  }, [bubble.x, bubble.y, bubble.r, x, y, r]);

  const style = useAnimatedStyle(() => {
    const p = swell.get();
    const d = r.get() * 2;
    return {
      width: d,
      height: d,
      borderRadius: d / 2,
      left: x.get() - d / 2,
      top: y.get() - d / 2,
      opacity: Math.min(1, p * 1.6),
      transform: [{ scale: 0.2 + 0.8 * p }],
    };
  });

  const color = inkOn(hue[0]);
  const size = labelSize(name, bubble.r);
  const showName = size !== 'percent';
  const showPercent = true;
  return (
    <Animated.View style={[styles.bubble, style]}>
      <LinearGradient colors={hue} start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }} style={StyleSheet.absoluteFill} />
      {showName ? (
        <Text style={[size === 'big' ? styles.bubbleName : styles.bubbleNameSmall, { color }]} numberOfLines={1} maxFontSizeMultiplier={1.1}>
          {name}
        </Text>
      ) : null}
      {showPercent ? (
        <Text style={[size === 'big' ? styles.bubblePercent : styles.bubblePercentAlone, { color }]} numberOfLines={1} maxFontSizeMultiplier={1.1}>
          {percentText(percent)}
        </Text>
      ) : null}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  // The bond card's frame (Us), so the two read as one family.
  card: {
    marginHorizontal: 14,
    marginTop: 14,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
  },
  month: inkType.card,
  subtitle: { ...inkType.sub, marginTop: 2 },
  box: { marginTop: 14 },
  bubble: { position: 'absolute', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  bubbleName: { ...inkFace('subStrong'), textAlign: 'center', includeFontPadding: false },
  bubbleNameSmall: { ...inkFace('caption'), textAlign: 'center', includeFontPadding: false },
  bubblePercent: { ...inkFace('subStrong'), fontWeight: '700', fontVariant: ['tabular-nums'], textAlign: 'center', includeFontPadding: false, opacity: 0.86 },
  bubblePercentAlone: { ...inkFace('caption'), fontWeight: '700', fontVariant: ['tabular-nums'], textAlign: 'center', includeFontPadding: false },
});
