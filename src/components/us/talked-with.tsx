import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming, type SharedValue } from 'react-native-reanimated';

import { useDayKey } from '@/hooks/use-day-key';
import { shortName } from '@/lib/format';
import { monthStart, talkShares, type TalkShare } from '@/lib/talk-shares';
import { displayName, useAppStore } from '@/store/use-app-store';
import { fonts, isDark, systemGround } from '@/theme';

/**
 * One bright pair per place (the Ink canvas, owner 2026-11-13): coral, amber, sky. By rank, not the
 * friend's own hue: friend hues are muted and two friends can draw the same one, and the discs must
 * tell them apart. The calendar's dot for a friend uses the same colour (`talkHue`).
 */
export const TALK_HUES = [
  ['#FF5E62', '#FF9966'],
  ['#F8C13F', '#F08A3C'],
  ['#6E8BFF', '#58C7F3'],
] as const;

/** Where each disc's centre sits (the canvas layout): the biggest left, the next overlapping it low right, the third high right. */
const SPOTS = [
  { x: -55, y: -10 },
  { x: 46, y: 42 },
  { x: 80, y: -44 },
] as const;
/** A disc's diameter from its share, as on the canvas (46% → 150), never too small for its label, never wider than the middle. */
const discSize = (percent: number) => Math.round(Math.min(176, Math.max(100, 70 + percent * 1.75)));
const SWELL_MS = 900;
const STAGGER_MS = 120;
// The canvas's swell: a quick rise that overshoots a touch and settles.
const SWELL = Easing.bezier(0.2, 1.3, 0.4, 1);

/** This month's top friends by lines, worked out again when the chats or the day change. */
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

/** A friend's colour on the discs, or undefined when they are not among them. */
export function talkHue(shares: readonly TalkShare[], characterId: string | undefined): string | undefined {
  const i = shares.findIndex((s) => s.characterId === characterId);
  return i >= 0 ? TALK_HUES[i][0] : undefined;
}

/**
 * "Who you talked with" in the Ink look (owner, 2026-11-13, from the canvas frame "6 · Us"): the month
 * in serif, then up to three overlapping discs, one per friend, sized by their share of this month's
 * lines, blending where they overlap (screen at night, a little see-through by day), each with its name and whole
 * percent inside (HIG Charts: label the marks directly, no separate legend to match colours against).
 * The discs swell in one after another when the section first appears; reduced motion shows them at
 * once. Hidden until two friends have talked this month.
 */
export const TalkedWith = memo(function TalkedWith() {
  const { t, i18n } = useTranslation();
  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);
  const shares = useTalkShares();
  const swell = [useSharedValue(0), useSharedValue(0), useSharedValue(0)];

  useEffect(() => {
    if (!shares.length) return;
    swell.forEach((v, i) => v.set(withDelay(i * STAGGER_MS, withTiming(1, { duration: SWELL_MS, easing: SWELL }))));
    // Once, when the discs first appear; later changes of the shares just resize them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shares.length > 0]);

  const layout = useMemo(() => {
    const discs = shares.map((s, i) => ({ s, i, size: discSize(s.percent), x: SPOTS[i].x, y: SPOTS[i].y }));
    if (!discs.length) return { discs, height: 0 };
    // Centre the group: its bounding box, then every disc shifted by the box's middle.
    const left = Math.min(...discs.map((d) => d.x - d.size / 2));
    const right = Math.max(...discs.map((d) => d.x + d.size / 2));
    const top = Math.min(...discs.map((d) => d.y - d.size / 2));
    const bottom = Math.max(...discs.map((d) => d.y + d.size / 2));
    const mx = (left + right) / 2;
    const my = (top + bottom) / 2;
    return { discs: discs.map((d) => ({ ...d, x: d.x - mx, y: d.y - my })), height: bottom - top };
  }, [shares]);

  if (shares.length === 0) return null;

  const nameOf = (s: TalkShare) => {
    const c = characters.find((x) => x.id === s.characterId);
    return c ? shortName(displayName(c, relationships[c.id])) : '';
  };
  const month = new Intl.DateTimeFormat(i18n.language, { month: 'long' }).format(new Date());
  const monthTitle = month.charAt(0).toLocaleUpperCase(i18n.language) + month.slice(1);
  const summary = shares.map((s) => `${nameOf(s)} ${s.percent}%`).join(', ');

  return (
    <View style={styles.root}>
      <Text style={styles.month} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
        {monthTitle}
      </Text>
      <Text style={styles.subtitle} maxFontSizeMultiplier={1.3}>
        {t('us.whoTalked')}
      </Text>
      <View style={[styles.discs, { height: layout.height }]} accessible accessibilityLabel={`${monthTitle}, ${t('us.whoTalked')}: ${summary}`}>
        {/* Drawn smallest first, so the biggest share sits on top; the labels ride above every disc. */}
        {[...layout.discs].reverse().map((d) => (
          <Disc key={d.s.characterId} size={d.size} x={d.x} y={d.y} hue={TALK_HUES[d.i]} swell={swell[d.i]} />
        ))}
        {layout.discs.map((d) => (
          <DiscLabel key={d.s.characterId} size={d.size} x={d.x} y={d.y} swell={swell[d.i]} name={nameOf(d.s)} percent={d.s.percent} />
        ))}
      </View>
    </View>
  );
});

/** The disc's see-through by day (no blend there); full at night, where screen does the mixing. */
const DISC_OPACITY = isDark ? 1 : 0.86;

function useSwellStyle(swell: SharedValue<number>, opacity = 1) {
  return useAnimatedStyle(() => {
    const p = swell.get();
    return { opacity: opacity * Math.min(1, p * 1.6), transform: [{ scale: 0.2 + 0.8 * p }] };
  });
}

function Disc({ size, x, y, hue, swell }: { size: number; x: number; y: number; hue: readonly [string, string]; swell: SharedValue<number> }) {
  const style = useSwellStyle(swell, DISC_OPACITY);
  return (
    <Animated.View style={[styles.disc, { width: size, height: size, borderRadius: size / 2, marginLeft: x - size / 2, marginTop: y - size / 2 }, style]}>
      <LinearGradient colors={hue} start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

function DiscLabel({ size, x, y, swell, name, percent }: { size: number; x: number; y: number; swell: SharedValue<number>; name: string; percent: number }) {
  const style = useSwellStyle(swell);
  return (
    <Animated.View pointerEvents="none" style={[styles.label, { width: size - 20, marginLeft: x - (size - 20) / 2, marginTop: y - 12 }, style]}>
      <Text style={styles.labelText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} maxFontSizeMultiplier={1.2}>
        {name} <Text style={styles.labelPercent}>{`${percent}%`}</Text>
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { marginHorizontal: 20, marginTop: 22 },
  month: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 38, letterSpacing: -0.4, color: systemGround.label },
  subtitle: { marginTop: 2, fontSize: 15, lineHeight: 20, color: systemGround.secondaryLabel },
  discs: { marginTop: 16 },
  disc: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    overflow: 'hidden',
    // Screen lights the overlaps on black (the canvas); on the light ground multiply muddied them to
    // brown on the A51, so by day the discs are just a little see-through.
    ...(isDark ? { mixBlendMode: 'screen' as const } : null),
  },
  label: { position: 'absolute', left: '50%', top: '50%', height: 24, alignItems: 'center', justifyContent: 'center' },
  // Dark ink on the bright discs reads in both appearances (WCAG AA on the lightest stop).
  labelText: { fontSize: 15, lineHeight: 20, fontWeight: '600', color: 'rgba(0,0,0,0.86)', textAlign: 'center' },
  labelPercent: { fontWeight: '700', fontVariant: ['tabular-nums'] },
});
