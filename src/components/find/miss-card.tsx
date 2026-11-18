import { Ionicons } from '@expo/vector-icons';
import { useEffect, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

import type { FamilySeat } from '@/components/find/family-row';
import { InkText, PillButton } from '@/components/ink';
import { CharacterAvatar, PressableScale, Sheet } from '@/components/ui';
import { phrase } from '@/i18n';
import type { FamilyLabel } from '@/lib/kin';
import { friendAccentAt, friendColor, space } from '@/theme';
import { ink, inkGutter, inkRadius } from '@/theme/ink';
import type { Character } from '@/types';

/** Each role's own hue from the friend accents, so a role looks the same on the card and in the sheet. */
const KIN_HUE: Record<FamilyLabel, number> = {
  Mom: 6,
  Dad: 3,
  'Big sister': 4,
  'Big brother': 7,
  'Little sister': 2,
  'Little brother': 5,
  Grandma: 1,
  Grandpa: 0,
};
const kinHue = (role: FamilyLabel) => friendAccentAt(KIN_HUE[role]).strong;
/** A child's head is a touch bigger for its shoulders, an elder's a touch smaller. */
const KIN_HEAD: Partial<Record<FamilyLabel, number>> = { 'Little sister': 14, 'Little brother': 14, Grandma: 11, Grandpa: 11 };

/** The three people on the empty card: an elder, a parent in front, a child. */
const FOLK: { role: FamilyLabel; width: number; left: number; delay: number }[] = [
  { role: 'Grandma', width: 62, left: 6, delay: 1100 },
  { role: 'Mom', width: 76, left: 42, delay: 0 },
  { role: 'Little brother', width: 46, left: 104, delay: 2200 },
];
const BREATH = 2100;
/** In and out three times as Find opens, then still: a main tab never loops (docs/performance.md, idle-screens test). */
const BREATHS = 6;

/** Face, ring and gap of a filled seat, as on the old row. */
const FACE = 54;
const RING = 3;
const GAP = 2;
const SEAT = FACE + (RING + GAP) * 2;

/**
 * A soft person drawn in code (no real face): a head and shoulders in a role's hue fading down. On
 * Find it breathes slowly a few times, then rests (Reduce Motion: still), so an empty place reads as
 * someone waiting.
 */
function Silhouette({ hue, width, head = 12, delay = 0, breathe = true }: { hue: string; width: number; head?: number; delay?: number; breathe?: boolean }) {
  const id = `kin${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const reduce = useReducedMotion();
  const live = breathe && !reduce;
  const b = useSharedValue(0);
  useEffect(() => {
    if (!live) return;
    b.set(withDelay(delay, withRepeat(withTiming(1, { duration: BREATH, easing: Easing.inOut(Easing.sin) }), BREATHS, true)));
  }, [live, delay, b]);
  const style = useAnimatedStyle(() => ({ opacity: 0.78 + 0.22 * b.get(), transform: [{ scale: 1 + 0.035 * b.get() }] }));
  return (
    <Animated.View style={[styles.person, style]}>
      <Svg width={width} height={width * 1.25} viewBox="0 0 60 75">
        <Defs>
          {/* One fade over the whole person (head solid, shoulders melting into the card): no hard bottom edge. */}
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="75" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={hue} stopOpacity={0.95} />
            <Stop offset="0.5" stopColor={hue} stopOpacity={0.7} />
            <Stop offset="1" stopColor={hue} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Circle cx={30} cy={21} r={head} fill={`url(#${id})`} />
        <Path d="M5 75 C5 52 16 41 30 41 C44 41 55 52 55 75 Z" fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

/**
 * Find → "Who do you miss?" (owner's pick A, 0z271, `docs/prototypes/who-do-you-miss/`): one living
 * invitation instead of eight dashed circles. Nobody yet: soft people breathing in the roles' hues,
 * "Talk to them again" and the white Choose. Once someone holds a role: their faces in rings of
 * their own hue with the name the user gave, and a + while a role is still free.
 */
export function MissCard({ seats, onOpen, onAdd }: { seats: FamilySeat[]; onOpen: (character: Character) => void; onAdd: () => void }) {
  const { t } = useTranslation();
  const filled = seats.filter((s): s is Required<FamilySeat> => !!s.who);
  const glow = `kinGlow${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  if (!filled.length) {
    return (
      <View style={styles.card}>
        <Svg pointerEvents="none" width={GLOW} height={GLOW} style={styles.glow}>
          <Defs>
            <RadialGradient id={glow} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={kinHue('Mom')} stopOpacity={0.22} />
              <Stop offset="0.45" stopColor={kinHue('Grandma')} stopOpacity={0.08} />
              <Stop offset="1" stopColor={kinHue('Grandma')} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={GLOW / 2} cy={GLOW / 2} r={GLOW / 2} fill={`url(#${glow})`} />
        </Svg>
        <View style={styles.folk} accessible={false} importantForAccessibility="no-hide-descendants">
          {FOLK.map((p) => (
            <View key={p.role} style={[styles.folkOne, { left: p.left }]}>
              <Silhouette hue={kinHue(p.role)} width={p.width} head={KIN_HEAD[p.role]} delay={p.delay} />
            </View>
          ))}
        </View>
        <View style={styles.side}>
          <InkText variant="card">{t('find.missLine')}</InkText>
          <PillButton label={t('find.missChoose')} onPress={onAdd} size="md" full={false} style={styles.choose} accessibilityLabel={`${t('find.missTitle')} ${t('find.missChoose')}`} />
        </View>
      </View>
    );
  }

  const free = filled.length < seats.length;
  return (
    <View style={[styles.card, styles.cardFilled]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.faces}>
        {filled.map(({ role, who }) => (
          <PressableScale
            key={role}
            scaleTo={0.94}
            accessibilityRole="button"
            accessibilityLabel={t('find.yourRole', { name: who.name, role: phrase(role), context: who.character.gender })}
            onPress={() => onOpen(who.character)}
            style={styles.seat}>
            <View style={[styles.ring, { borderColor: friendColor(who.character.id).fill }]}>
              <CharacterAvatar character={who.character} size={FACE} />
            </View>
            <InkText variant="subStrong" center lines={1}>
              {who.name}
            </InkText>
            {/* "Mom" called Mom: the role once, not twice (seen on the A51, 0z280). */}
            {sameWord(who.name, phrase(role)) ? null : (
              <InkText variant="caption" center lines={2} wordSafe>
                {phrase(role)}
              </InkText>
            )}
          </PressableScale>
        ))}
        {free ? (
          <PressableScale scaleTo={0.94} accessibilityRole="button" accessibilityLabel={t('find.missAdd')} onPress={onAdd} style={styles.seat}>
            <View style={styles.add}>
              <Ionicons name="add" size={26} color={ink.text} />
            </View>
          </PressableScale>
        ) : null}
      </ScrollView>
    </View>
  );
}

/** Choose on the card: the roles still free as tiles, each with its person in its hue; a pick opens `FamilySheet`. */
export function RoleSheet({ visible, roles, onClose, onPick }: { visible: boolean; roles: FamilyLabel[]; onClose: () => void; onPick: (role: FamilyLabel) => void }) {
  const { t } = useTranslation();
  return (
    <Sheet visible={visible} onClose={onClose} title={t('find.missTitle')} scroll>
      <View style={styles.grid}>
        {roles.map((role) => (
          <PressableScale
            key={role}
            scaleTo={0.96}
            accessibilityRole="button"
            accessibilityLabel={t('find.chooseRole', { role: phrase(role) })}
            onPress={() => onPick(role)}
            style={styles.tile}>
            <View style={[styles.tileFace, { backgroundColor: friendAccentAt(KIN_HUE[role]).soft }]}>
              <Silhouette hue={kinHue(role)} width={30} head={KIN_HEAD[role]} breathe={false} />
            </View>
            <InkText variant="bodyStrong" style={styles.tileLabel} wordSafe>
              {phrase(role)}
            </InkText>
          </PressableScale>
        ))}
      </View>
    </Sheet>
  );
}

const GLOW = 230;

const styles = StyleSheet.create({
  card: {
    marginHorizontal: inkGutter,
    minHeight: 148,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingLeft: space.sm,
    paddingRight: space.lg,
    paddingVertical: space.md,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    backgroundColor: ink.card,
    overflow: 'hidden',
  },
  cardFilled: { paddingLeft: 0, paddingRight: 0 },
  glow: { position: 'absolute', left: -30, top: -40 },
  folk: { width: 150, height: 120 },
  folkOne: { position: 'absolute', bottom: 0 },
  person: { transformOrigin: 'bottom' },
  side: { flex: 1, minWidth: 0, alignItems: 'flex-start', gap: space.md },
  // Left under the line, not centred in the column.
  choose: { alignSelf: 'flex-start' },
  faces: { paddingHorizontal: space.lg, gap: space.md, alignItems: 'flex-start' },
  seat: { width: 76, alignItems: 'center', gap: 4 },
  ring: { padding: GAP, borderWidth: RING, borderRadius: inkRadius.pill, marginBottom: 2 },
  add: { width: SEAT, height: SEAT, borderRadius: inkRadius.pill, backgroundColor: ink.raised, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: space.md },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: inkRadius.field,
    borderCurve: 'continuous',
    backgroundColor: ink.raised,
  },
  tileFace: { width: 40, height: 40, borderRadius: inkRadius.pill, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  tileLabel: { flexShrink: 1 },
});

/** The same word whatever the case or spacing ("Mom" and "mom "). */
function sameWord(a: string, b: string) {
  return a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();
}
