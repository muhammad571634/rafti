import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { type ComponentRef, memo, type RefObject, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { HEROES } from '@/assets/heroes/registry';
import { PORTRAITS } from '@/assets/portraits/registry';
import { portraitPosition } from '@/components/chat/chat-ground';
import { InkText } from '@/components/ink';
import { CharacterAvatar } from '@/components/ui';
import { characterImage } from '@/components/ui/avatar';
import { phrase } from '@/i18n';
import { shortName } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { night } from '@/theme';
import { ink, inkEm, inkRadius, inkType } from '@/theme/ink';
import type { Character } from '@/types';

import { EASE_OUT } from './night-motion';

/** Where each card of the fan sits: the front card, two fanned behind it, one waiting out of sight. */
const SLOTS = [
  { x: 0, y: 0, r: 0, s: 1, o: 1 },
  { x: 18, y: 12, r: 5, s: 0.94, o: 1 },
  { x: -18, y: 22, r: -6, s: 0.88, o: 1 },
  { x: 0, y: 30, r: 0, s: 0.82, o: 0 },
];
const THROW_DISTANCE = 96;
const THROW_VELOCITY = 550;

export const relationOf = (c: Character) => c.relation ?? (c.series ? phrase(c.series) : '');

export interface NightDeckProps {
  /** The friends, front card first. */
  cards: Character[];
  /** A flick sends the front card to the back; a face brings its card to the front. */
  onOrder: (ids: string[]) => void;
  /** The front card's frame, for the hand-off into the name step's avatar. */
  frontRef: RefObject<ComponentRef<typeof View> | null>;
}

/**
 * The first friends as a fan of photo cards on the night: flick the front one away (its velocity
 * carries it off, a spring settles the rest), or tap a face under the fan. The front card's friend
 * is the choice; the horizon takes their colour (the screen's job).
 */
export const NightDeck = memo(function NightDeck({ cards, onOrder, frontRef }: NightDeckProps) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  // Fill the room the step leaves, at 3:4, never wider than the column.
  const h = Math.min(box.h - 34, (box.w - 36) / 0.75);
  const w = h * 0.75;
  const ids = cards.map((c) => c.id);

  const toBack = () => {
    haptic.tap();
    onOrder([...ids.slice(1), ids[0]]);
  };
  const toFront = (id: string) => {
    const i = ids.indexOf(id);
    if (i <= 0) return;
    haptic.selection();
    onOrder([...ids.slice(i), ...ids.slice(0, i)]);
  };

  return (
    <>
      <View style={styles.room} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        {/* Drawn back to front, so the front card is the last child: Android hit-tests children in drawing
            order, and a zIndex set from a worklet left the touches on a card behind it (A51, 0z250). */}
        {h > 0
          ? cards
              .map((c, i) => <DeckCard key={c.id} character={c} slot={Math.min(i, SLOTS.length - 1)} width={w} height={h} onThrown={toBack} frontRef={i === 0 ? frontRef : undefined} />)
              .reverse()
          : null}
      </View>
      <View style={styles.faces} accessibilityRole="radiogroup">
        {[...cards].sort((a, b) => a.id.localeCompare(b.id)).map((c) => {
          const on = c.id === ids[0];
          const ring = night.friendAccent(c.id).strong;
          return (
            <Pressable
              key={c.id}
              onPress={() => toFront(c.id)}
              hitSlop={6}
              accessibilityRole="radio"
              accessibilityLabel={`${shortName(c.name)}, ${relationOf(c)}`}
              accessibilityState={{ checked: on }}
              style={[styles.face, on && [styles.faceOn, { borderColor: ring }]]}>
              <CharacterAvatar character={c} size={44} />
            </Pressable>
          );
        })}
      </View>
    </>
  );
});

function DeckCard({ character, slot, width, height, onThrown, frontRef }: { character: Character; slot: number; width: number; height: number; onThrown: () => void; frontRef?: RefObject<ComponentRef<typeof View> | null> }) {
  const reduce = useReducedMotion();
  const pos = useSharedValue(slot);
  const x = useSharedValue(0);
  const front = slot === 0;

  useEffect(() => {
    // A card coming back into view from behind starts from the middle again (it left off-screen).
    if (slot <= 2 && slot > 0) x.set(0);
    pos.set(reduce ? withTiming(slot, { duration: 200 }) : withSpring(slot, { duration: 460, dampingRatio: 0.78 }));
  }, [slot, reduce, pos, x]);

  const pan = Gesture.Pan()
    .enabled(front)
    .activeOffsetX([-10, 10])
    .failOffsetY([-14, 14])
    .onUpdate((e) => {
      x.set(e.translationX);
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > THROW_DISTANCE || Math.abs(e.velocityX) > THROW_VELOCITY) {
        const dir = Math.sign(e.translationX || e.velocityX);
        x.set(withTiming(dir * width * 1.6, { duration: 240, easing: EASE_OUT }, (done) => {
          if (done) scheduleOnRN(onThrown);
        }));
      } else {
        x.set(withSpring(0, { duration: 400, dampingRatio: 0.8, velocity: e.velocityX }));
      }
    });

  const style = useAnimatedStyle(() => {
    const p = pos.get();
    const at = (k: 'x' | 'y' | 'r' | 's' | 'o') => interpolate(p, [0, 1, 2, 3], SLOTS.map((s) => s[k]));
    const dx = x.get();
    return {
      opacity: at('o'),
      transform: [{ translateX: at('x') + dx }, { translateY: at('y') + Math.abs(dx) * 0.06 }, { rotate: `${at('r') + dx / 16}deg` }, { scale: at('s') }],
    };
  });

  const hue = night.friendAccent(character.id).strong;
  const small = height < 300;
  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.card, { width, height, marginLeft: -width / 2, zIndex: 10 - slot }, style]}>
        <View ref={frontRef} collapsable={false} style={StyleSheet.absoluteFill} accessible accessibilityLabel={`${shortName(character.name)}, ${relationOf(character)}`}>
          <Image
            source={HEROES[character.id] ?? PORTRAITS[character.id] ?? characterImage(character)}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            contentPosition={HEROES[character.id] ? undefined : portraitPosition(character.id, width / height)}
          />
          <LinearGradient
            colors={['rgba(9,9,13,0.22)', 'rgba(9,9,13,0)', 'rgba(9,9,13,0.42)', 'rgba(9,9,13,0.94)']}
            locations={[0, 0.28, 0.58, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.topRow}>
            <View style={styles.chip}>
              <InkText variant="caption" lines={1} style={inkEm(hue)}>
                {relationOf(character)}
              </InkText>
            </View>
          </View>
          <View style={styles.text}>
            <InkText variant={small ? 'card' : 'title'} lines={1} style={styles.name}>
              {shortName(character.name)}
            </InkText>
            {small ? null : (
              <InkText variant="sub" color="rgba(255,255,255,0.85)" lines={3} style={styles.quote}>
                {`“${character.greeting}”`}
              </InkText>
            )}
          </View>
        </View>
        {front ? (
          <Pressable
            onPress={onThrown}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={shortName(character.name)}
            style={({ pressed }) => [styles.nextBtn, pressed && styles.nextBtnPressed]}>
            <Ionicons name="chevron-forward" size={16} color={ink.text} />
          </Pressable>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  room: { flex: 1, minHeight: 0, marginTop: 14 },
  card: {
    position: 'absolute',
    left: '50%',
    top: 0,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.photoGlassRim,
  },
  topRow: { position: 'absolute', top: 14, left: 14, right: 56, flexDirection: 'row', alignItems: 'center' },
  nextBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: inkRadius.pill,
    backgroundColor: ink.photoGlass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.photoGlassRim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnPressed: { opacity: 0.72, transform: [{ scale: 0.94 }] },
  text: { position: 'absolute', left: 18, right: 18, bottom: 18 },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: inkRadius.pill,
    backgroundColor: ink.photoGlass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.photoGlassRim,
  },
  name: { marginTop: 0 },
  quote: { ...inkType.quote, marginTop: 5 },
  faces: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 14 },
  face: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  faceOn: { transform: [{ scale: 1.06 }] },
});
