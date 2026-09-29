import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Anim, BrandArt, Sheet, Txt } from '@/components/ui';
import type { LevelUpEvent } from '@/store/use-app-store';
import { colors, palette, radius, space } from '@/theme';

export interface LevelUpModalProps {
  event: LevelUpEvent | null;
  characterName: string;
  onClose: () => void;
}

/**
 * "Ta-da~ Your relationship has moved up a level!": a thought bubble with the
 * announcement, doodles in the corners and two Raftis in a bath of hearts underneath.
 * Tapping anywhere dismisses it, like the reference.
 */
export function LevelUpModal({ event, characterName, onClose }: LevelUpModalProps) {
  const { t } = useTranslation();

  return (
    <Sheet visible={!!event} onClose={onClose} center>
      <Pressable onPress={onClose} style={styles.card}>
        <Anim name="confetti" size={300} loop={false} style={styles.confetti} />
        <ThoughtDots />
        <Sun />

        <View style={styles.bubble}>
          <Txt variant="h3" center color={palette.mint500} style={styles.bubbleText}>
            {t('levelUp.title')}
          </Txt>
        </View>

        <BrandArt name="levelUp" width={240} radius={radius.xl} bob />

        {event ? (
          <View style={styles.pill}>
            <Txt variant="smallStrong" color={colors.accent}>
              {t('levelUp.levelLabel', { level: event.level, title: event.levelTitle })}
            </Txt>
          </View>
        ) : null}

        <Txt variant="small" color={colors.textMuted} center>
          {t('levelUp.subtitle', { name: characterName })}
        </Txt>
      </Pressable>
    </Sheet>
  );
}

/** The little grey cloud creature peeking over the top-left corner. */
function ThoughtDots() {
  return (
    <Svg width={70} height={46} style={styles.dots}>
      <Circle cx={30} cy={24} r={18} fill={palette.gray400} />
      <Circle cx={14} cy={30} r={11} fill={palette.gray400} />
      <Circle cx={26} cy={22} r={3} fill={palette.gray900} />
      <Circle cx={36} cy={22} r={3} fill={palette.gray900} />
      <Circle cx={55} cy={36} r={5} fill={palette.gray300} />
    </Svg>
  );
}

/** The orange spiral-sun doodle in the top-right corner. */
function Sun() {
  const rays = Array.from({ length: 10 }, (_, i) => {
    const angle = (i * Math.PI * 2) / 10;
    const x1 = 26 + Math.cos(angle) * 14;
    const y1 = 26 + Math.sin(angle) * 14;
    const x2 = 26 + Math.cos(angle) * 22;
    const y2 = 26 + Math.sin(angle) * 22;
    return `M${x1} ${y1} L${x2} ${y2}`;
  }).join(' ');

  return (
    <Svg width={52} height={52} style={styles.sun}>
      <Path d={rays} stroke={palette.amber} strokeWidth={3} strokeLinecap="round" />
      <Path
        d="M26 26 m-2 0 a2 2 0 1 1 4 0 a5 5 0 1 1 -9 -1 a8 8 0 1 1 13 7"
        stroke={palette.amber}
        strokeWidth={2.6}
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: space.sm, paddingTop: space.lg },
  confetti: { position: 'absolute', top: -60, alignSelf: 'center' },
  dots: { position: 'absolute', top: -space.sm, left: -space.sm },
  sun: { position: 'absolute', top: -space.sm, right: -space.xs },
  bubble: {
    alignSelf: 'stretch',
    marginHorizontal: space.md,
    marginTop: space.xl,
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
    borderRadius: radius.pill,
    backgroundColor: palette.mint50,
  },
  bubbleText: { lineHeight: 25 },
  pill: {
    paddingHorizontal: space.lg,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
  },
});
