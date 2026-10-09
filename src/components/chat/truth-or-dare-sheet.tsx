import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';

import { Button, CharacterAvatar, Sheet, Txt } from '@/components/ui';
import { shortName } from '@/lib/format';
import { useAppStore } from '@/store/use-app-store';
import { colors, fonts, palette, space } from '@/theme';
import type { Character } from '@/types';

const SIZE = 240;
const SPIN_MS = 2600;
const TURNS = 5;

type Target = 'them' | 'you';

/**
 * Truth or dare: the wheel decides who answers. On them, the user picks truth or
 * dare and the question goes to chat; on the user, they ask one in chat.
 */
export function TruthOrDareSheet({
  visible,
  onClose,
  character,
  name,
}: {
  visible: boolean;
  onClose: () => void;
  character: Character;
  name: string;
}) {
  const { t } = useTranslation();
  const play = useAppStore((s) => s.playTruthOrDare);
  const rotation = useSharedValue(0);
  const [spinning, setSpinning] = useState(false);
  const [target, setTarget] = useState<Target | null>(null);
  const first = shortName(name);

  // A fresh game each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setTarget(null);
    setSpinning(false);
  }, [visible]);

  const wheelStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  const spin = () => {
    if (spinning) return;
    const winner: Target = Math.random() < 0.5 ? 'them' : 'you';
    // The pointer is at the top. "You" is the right half (0-180 deg on the wheel),
    // "them" the left half; land well inside the half, never on the line.
    const angle = 25 + Math.random() * 130 + (winner === 'them' ? 180 : 0);
    const base = Math.ceil(rotation.value / 360) * 360;
    setTarget(null);
    setSpinning(true);
    rotation.value = withTiming(
      base + TURNS * 360 - angle,
      { duration: SPIN_MS, easing: Easing.out(Easing.cubic) },
      (done) => {
        if (done) runOnJS(land)(winner);
      },
    );
  };

  function land(winner: Target) {
    setSpinning(false);
    setTarget(winner);
  }

  const choose = (kind: 'truth' | 'dare') => {
    if (!target) return;
    play(character.id, target, kind);
    onClose();
  };

  const r = SIZE / 2;

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={styles.body}>
        <Txt variant="h1">{t('games.truthOrDare')}</Txt>

        <View style={styles.wheelWrap}>
          <Animated.View style={[styles.wheel, wheelStyle]}>
            <Svg width={SIZE} height={SIZE}>
              <Path d={`M${r} ${r} L${r} 0 A${r} ${r} 0 0 1 ${r} ${SIZE} Z`} fill={palette.apricot100} />
              <Path d={`M${r} ${r} L${r} ${SIZE} A${r} ${r} 0 0 1 ${r} 0 Z`} fill={palette.apricot300} />
              <SvgText x={r * 1.5} y={r + 7} fontSize={20} fontWeight="700" fontFamily={fonts.body} fill={colors.text} textAnchor="middle">
                {t('games.you')}
              </SvgText>
              <SvgText x={r * 0.5} y={r + 7} fontSize={20} fontWeight="700" fontFamily={fonts.body} fill={colors.text} textAnchor="middle">
                {first}
              </SvgText>
              <Circle cx={r} cy={r} r={30} fill={colors.surface} />
            </Svg>
          </Animated.View>
          <View style={styles.pointer} />
          <View style={styles.hub} pointerEvents="none">
            <CharacterAvatar character={character} size={48} />
          </View>
        </View>

        {target ? (
          <>
            <Txt variant="title" center>
              {target === 'them' ? t('games.landedThem', { name: first }) : t('games.landedYou')}
            </Txt>
            <View style={styles.pair}>
              <Button label={t('games.truth')} size="lg" variant="secondary" style={styles.grow} onPress={() => choose('truth')} />
              <Button label={t('games.dare')} size="lg" variant="secondary" style={styles.grow} onPress={() => choose('dare')} />
            </View>
          </>
        ) : (
          <Button label={t('games.spin')} size="lg" full loading={spinning} onPress={spin} />
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.xl, paddingBottom: space.sm },
  grow: { flex: 1 },
  wheelWrap: { alignSelf: 'center', width: SIZE, height: SIZE, marginTop: space.md },
  wheel: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, overflow: 'hidden' },
  pointer: {
    position: 'absolute',
    top: -16,
    left: SIZE / 2 - 12,
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderTopWidth: 22,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.text,
  },
  hub: { position: 'absolute', top: SIZE / 2 - 24, left: SIZE / 2 - 24 },
  pair: { flexDirection: 'row', gap: space.md },
});
