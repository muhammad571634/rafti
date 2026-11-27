import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { CharacterAvatar } from '@/components/ui';
import type { TalkShare } from '@/lib/talk-shares';
import { ink } from '@/theme/ink';
import type { Character } from '@/types';

import { TALK_HUES } from './talked-with';

/** The ring's stroke and the gap between two friends' arcs, in points. */
const STROKE = 3;
const GAP = 3;

/**
 * This month's talk on Us' friend strip (replaces the "Nov · 38%" header capsule, owner 2026-11-25):
 * a ring cut into one arc per friend in their talk colour, sized by their share of the month's lines,
 * with the friend you talked with most inside. No numbers on it; the sheet it opens has them.
 */
export function MonthDonut({ shares, top, size }: { shares: readonly TalkShare[]; top?: Character; size: number }) {
  const r = (size - STROKE) / 2;
  const c = 2 * Math.PI * r;
  const total = shares.reduce((sum, s) => sum + Math.max(0, s.lines), 0);
  const gap = shares.length > 1 ? GAP : 0;
  let start = 0;
  const arcs = shares.map((s, i) => {
    const length = total > 0 ? (Math.max(0, s.lines) / total) * c : 0;
    const arc = { key: s.characterId, color: TALK_HUES[i % TALK_HUES.length][0], dash: Math.max(0, length - gap), offset: -start };
    start += length;
    return arc;
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={styles.ring}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={ink.edge} strokeWidth={STROKE} fill="none" />
        {arcs.map((a) =>
          a.dash > 0 ? (
            <Circle
              key={a.key}
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={a.color}
              strokeWidth={STROKE}
              strokeDasharray={`${a.dash} ${c}`}
              strokeDashoffset={a.offset}
              strokeLinecap="butt"
              fill="none"
            />
          ) : null,
        )}
      </Svg>
      {top ? (
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <CharacterAvatar character={top} size={size - (STROKE + GAP + 2) * 2} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Arcs start at 12 o'clock and run clockwise.
  ring: { transform: [{ rotate: '-90deg' }] },
  center: { alignItems: 'center', justifyContent: 'center' },
});
