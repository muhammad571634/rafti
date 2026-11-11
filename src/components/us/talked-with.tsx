import { LinearGradient } from 'expo-linear-gradient';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/ui';
import { useDayKey } from '@/hooks/use-day-key';
import { shortName } from '@/lib/format';
import { monthStart, talkShares, type TalkShare } from '@/lib/talk-shares';
import { displayName, useAppStore } from '@/store/use-app-store';
import { friendColor, isDark, space, systemGround } from '@/theme';

const HEIGHT = 168;
/** An orb's diameter from its share: never so small its glow vanishes, never wider than the card's middle. */
const orbSize = (percent: number) => Math.round(76 + percent * 1.3);
/** Where each orb sits, as offsets from the card's centre: the biggest left, the others overlapping it. */
const SPOTS = [
  { x: -46, y: 6 },
  { x: 40, y: 26 },
  { x: 54, y: -34 },
] as const;

/**
 * "Who you talked with · November" (owner's brief, 2026-11-11, from the dark prototype): up to three
 * overlapping glowing glass orbs, one per friend, sized by their share of this month's lines, in
 * the friend's own hue, blending where they overlap (screen at night, multiply by day), with a
 * legend of names and whole percents in tabular figures. Hidden until two friends have talked
 * this month. Read only from the store; worked out again when the chats or the day change.
 */
export const TalkedWith = memo(function TalkedWith() {
  const { t, i18n } = useTranslation();
  const conversations = useAppStore((s) => s.conversations);
  const messages = useAppStore((s) => s.messages);
  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);
  const today = useDayKey();

  const shares = useMemo(
    () => talkShares(conversations.map((c) => ({ conversationId: c.id, characterId: c.characterId })), messages, monthStart()),
    // `today` turns the month over at midnight on the 1st.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conversations, messages, today],
  );
  if (shares.length === 0) return null;

  const nameOf = (s: TalkShare) => {
    const c = characters.find((x) => x.id === s.characterId);
    return c ? shortName(displayName(c, relationships[c.id])) : '';
  };
  const month = new Intl.DateTimeFormat(i18n.language, { month: 'long' }).format(new Date());
  const title = t('us.talkedWith', { month: month.charAt(0).toLocaleUpperCase(i18n.language) + month.slice(1) });
  const summary = shares.map((s) => `${nameOf(s)} ${s.percent}%`).join(', ');

  return (
    <View style={styles.card}>
      <Txt style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
        {title}
      </Txt>
      <View style={styles.orbs} accessible accessibilityLabel={`${title}: ${summary}`}>
        {/* Drawn smallest first, so the biggest share sits on top. */}
        {shares
          .map((s, i) => ({ s, i }))
          .reverse()
          .map(({ s, i }) => {
            const size = orbSize(s.percent);
            const hue = friendColor(s.characterId).fill;
            return (
              <View
                key={s.characterId}
                style={[
                  styles.orb,
                  {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    marginLeft: SPOTS[i].x - size / 2,
                    marginTop: SPOTS[i].y - size / 2,
                    boxShadow: `0px 0px ${Math.round(size / 3)}px 0px ${hue}88`,
                  },
                ]}>
                <LinearGradient colors={[`${hue}F2`, `${hue}99`]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]} />
                {/* A specular highlight on the glass, top left. */}
                <View style={[styles.shine, { width: size * 0.42, height: size * 0.24, borderRadius: size }]} />
              </View>
            );
          })}
      </View>
      <View style={styles.legend}>
        {shares.map((s) => (
          <View key={s.characterId} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: friendColor(s.characterId).fill }]} />
            <Txt style={styles.legendName} lines={1} maxFontSizeMultiplier={1.3}>
              {nameOf(s)}
            </Txt>
            <Txt style={styles.legendPercent} maxFontSizeMultiplier={1.3}>{`${s.percent}%`}</Txt>
          </View>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 14,
    marginTop: space.md,
    paddingTop: space.lg,
    paddingBottom: space.lg,
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: systemGround.card,
    ...(isDark ? { borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.08)' } : null),
  },
  title: { marginHorizontal: space.lg, fontSize: 15, fontWeight: '600', letterSpacing: -0.2, color: systemGround.secondaryLabel },
  orbs: { height: HEIGHT, alignItems: 'center', justifyContent: 'center' },
  orb: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    overflow: 'hidden',
    mixBlendMode: isDark ? 'screen' : 'multiply',
    opacity: isDark ? 0.92 : 0.85,
  },
  shine: { position: 'absolute', top: '14%', left: '18%', backgroundColor: 'rgba(255,255,255,0.28)' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: space.lg, rowGap: space.xs, marginHorizontal: space.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: 160 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendName: { flexShrink: 1, fontSize: 15, color: systemGround.label },
  legendPercent: { fontSize: 15, fontWeight: '700', color: systemGround.label, fontVariant: ['tabular-nums'] },
});
