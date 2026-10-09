import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { PaywallSheet } from '@/components/paywall-sheet';
import {
  Button,
  CharacterAvatar,
  ClayIcon,
  EmptyState,
  Header,
  PressableScale,
  Screen,
  Sheet,
  ShellBadge,
  ShellIcon,
  Txt,
} from '@/components/ui';
import { shortName } from '@/lib/format';
import { DATE_PLACES, type DatePlace } from '@/mock/dates';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, hitSlop, palette, radius, shadows, space } from '@/theme';

/** A place on the map: a white card with the place's art on its tint, name and price. */
const CARD_W = 128;
const ART_H = 76;
const CARD_PAD = space.sm;

/**
 * The date map: places to go with one friend. A place opens once the bond is close
 * enough; a tap shows what it costs and starts the date. Calm cards on the playful map
 * (docs/design-style.md): white place cards, a white top bar and an action bar.
 */
export default function DatingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const shells = useAppStore((s) => s.wallet.shells);
  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);
  const conversations = useAppStore((s) => s.conversations);
  const dates = useAppStore((s) => s.dates);
  const beginDate = useAppStore((s) => s.beginDate);

  const known = useMemo(
    () =>
      characters
        .filter((c) => relationships[c.id] && conversations.some((v) => v.characterId === c.id))
        .sort((a, b) => relationships[b.id].intimacy - relationships[a.id].intimacy),
    [characters, relationships, conversations],
  );

  const [partnerId, setPartnerId] = useState(known[0]?.id);
  const [choosing, setChoosing] = useState(false);
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [paywall, setPaywall] = useState<number | null>(null);
  const [map, setMap] = useState({ width: 0, height: 0 });

  const partner = known.find((c) => c.id === partnerId) ?? known[0];
  const level = partner ? (relationships[partner.id]?.level ?? 0) : 0;
  const place = DATE_PLACES.find((p) => p.id === placeId);
  const been = useMemo(
    () => new Set(dates.filter((d) => d.characterId === partner?.id).map((d) => d.placeId)),
    [dates, partner],
  );

  if (!partner) {
    return (
      <Screen background={colors.bgPlain}>
        <Header title={t('dating.title')} />
        <EmptyState title={t('dating.noFriends')} actionLabel={t('find.title')} onAction={() => router.push('/(tabs)/find')} />
      </Screen>
    );
  }

  const name = shortName(displayName(partner, relationships[partner.id]));

  const start = (p: DatePlace) => {
    const result = beginDate(partner.id, p.id);
    if (result === 'noShells') return setPaywall(p.cost);
    if (result !== 'ok') return;
    setPlaceId(null);
    router.push({ pathname: '/date/[placeId]', params: { placeId: p.id, characterId: partner.id } });
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setMap({ width, height });
  };

  return (
    <Screen background={palette.cream200} edgeToEdge>
      <View style={StyleSheet.absoluteFill} onLayout={onLayout}>
        <MapArt width={map.width} height={map.height} />
        {map.width > 0
          ? DATE_PLACES.map((p) => (
              <PlaceCard
                key={p.id}
                place={p}
                locked={level < p.levelRequired}
                been={been.has(p.id)}
                left={p.x * map.width}
                top={p.y * map.height}
                onPress={() => setPlaceId(p.id)}
              />
            ))
          : null}
      </View>

      <View style={[styles.top, { paddingTop: insets.top + space.sm }]}>
        <PressableScale
          style={[styles.round, shadows.card]}
          hitSlop={hitSlop}
          scaleTo={0.9}
          accessibilityLabel={t('common.back')}
          onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </PressableScale>
        <PressableScale
          style={[styles.who, shadows.card]}
          scaleTo={0.95}
          accessibilityLabel={t('dating.choosePartner')}
          onPress={() => setChoosing(true)}>
          <CharacterAvatar character={partner} size={36} />
          <View style={styles.whoText}>
            <Txt variant="bodyStrong" lines={1}>
              {name}
            </Txt>
            <Txt variant="caption" color={colors.bondText} style={styles.bold}>
              {t('dating.level', { level })}
            </Txt>
          </View>
          <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
        </PressableScale>
        <View style={styles.grow} />
        <ShellBadge count={shells} tone="neutral" style={[styles.balance, shadows.card]} />
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + space.lg }]}>
        <Button
          label={t('dating.album', { count: dates.length })}
          variant="secondary"
          size="lg"
          full
          left={<Ionicons name="images-outline" size={20} color={colors.text} />}
          onPress={() => router.push('/date/album')}
        />
      </View>

      <Sheet visible={choosing} onClose={() => setChoosing(false)} title={t('dating.choosePartner')}>
        <View style={styles.people}>
          {known.map((c) => (
            <PressableScale
              key={c.id}
              style={styles.person}
              scaleTo={0.94}
              onPress={() => {
                setPartnerId(c.id);
                setChoosing(false);
              }}>
              <CharacterAvatar character={c} size={60} ring={c.id === partner.id} ringColor={colors.text} />
              <Txt variant="smallStrong" lines={1} color={c.id === partner.id ? colors.text : colors.textMuted}>
                {shortName(displayName(c, relationships[c.id]))}
              </Txt>
            </PressableScale>
          ))}
        </View>
      </Sheet>

      <Sheet visible={!!place} onClose={() => setPlaceId(null)}>
        {place ? (
          <View style={styles.place}>
            <View style={[styles.hero, { backgroundColor: place.tint }]}>
              <ClayIcon name={place.icon} size={112} tile={false} />
            </View>
            <Txt variant="h2">{t(`dating.scenarios.${place.titleKey}`)}</Txt>
            <View style={styles.facts}>
              <Fact value={String(place.rounds.length)} label={t('dating.rounds')} />
              <Fact value={t('dating.level', { level: place.levelRequired })} label={t('dating.closeness')} />
              <Fact value={String(place.cost)} label={t('dating.shells')} shell />
            </View>
            {level < place.levelRequired ? (
              <Button label={t('dating.locked', { level: place.levelRequired })} size="lg" full disabled />
            ) : (
              <Button label={t('dating.start', { name })} size="lg" full onPress={() => start(place)} />
            )}
          </View>
        ) : null}
      </Sheet>

      <PaywallSheet need={paywall} onClose={() => setPaywall(null)} />
    </Screen>
  );
}

/** One place on the map: art on its tint, name, then the price or the level it needs. */
function PlaceCard({
  place,
  locked,
  been,
  left,
  top,
  onPress,
}: {
  place: DatePlace;
  locked: boolean;
  been: boolean;
  left: number;
  top: number;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  return (
    <PressableScale
      scaleTo={0.94}
      accessibilityLabel={t(`dating.scenarios.${place.titleKey}`)}
      style={[styles.card, shadows.card, been && styles.cardBeen, locked && styles.cardLocked, { left, top }]}
      onPress={onPress}>
      <View style={[styles.art, { backgroundColor: place.tint }]}>
        <ClayIcon name={place.icon} size={58} tile={false} style={locked ? styles.dim : undefined} />
        {locked ? (
          <View style={styles.lock}>
            <Ionicons name="lock-closed-outline" size={14} color={colors.text} />
          </View>
        ) : null}
      </View>
      <Txt variant="bodyStrong" center lines={2}>
        {t(`dating.places.${place.titleKey}`)}
      </Txt>
      <View style={styles.meta}>
        {locked ? null : <ShellIcon size={13} />}
        <Txt variant="caption" color={colors.textSecondary} style={styles.bold}>
          {locked ? t('dating.level', { level: place.levelRequired }) : String(place.cost)}
        </Txt>
      </View>
    </PressableScale>
  );
}

function Fact({ value, label, shell }: { value: string; label: string; shell?: boolean }) {
  return (
    <View style={styles.fact}>
      <View style={styles.factValue}>
        {shell ? <ShellIcon size={18} /> : null}
        <Txt variant="figure">{value}</Txt>
      </View>
      <Txt variant="caption" color={colors.textMuted}>
        {label}
      </Txt>
    </View>
  );
}

/** A dotted path from place to place, through the middle of each card's art, in map order. */
function trail(w: number, h: number) {
  const pts = DATE_PLACES.map((p) => [p.x * w + CARD_W / 2, p.y * h + CARD_PAD + ART_H / 2]);
  return pts
    .map(([x, y], i) => {
      if (i === 0) return `M${x} ${y}`;
      const [px, py] = pts[i - 1];
      // A gentle bend: the control point sits halfway, pushed sideways.
      return `Q${(px + x) / 2 + (i % 2 ? 40 : -40)} ${(py + y) / 2} ${x} ${y}`;
    })
    .join(' ');
}

/** Sea in the corner, a dotted path between the places and a few trees, drawn in code. */
function MapArt({ width: w, height: h }: { width: number; height: number }) {
  if (!w || !h) return null;
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
      <Path
        d={`M0 0 H${w} V${h * 0.13} C${w * 0.8} ${h * 0.2} ${w * 0.66} ${h * 0.1} ${w * 0.45} ${h * 0.16} C${w * 0.24} ${h * 0.22} ${w * 0.15} ${h * 0.14} 0 ${h * 0.19} Z`}
        fill={palette.sky200}
      />
      <Path d={trail(w, h)} fill="none" stroke={palette.cream300} strokeWidth={6} strokeDasharray="2 14" strokeLinecap="round" />
      <Circle cx={w * 0.9} cy={h * 0.47} r={16} fill="#CFE3C4" />
      <Circle cx={w * 0.93} cy={h * 0.455} r={11} fill="#BFE3B4" />
      <Circle cx={w * 0.06} cy={h * 0.66} r={13} fill="#CFE3C4" />
      <Circle cx={w * 0.85} cy={h * 0.83} r={14} fill="#BFE3B4" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  bold: { fontWeight: '600' },
  top: { position: 'absolute', left: space.md, right: space.md, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  round: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  who: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    height: 44,
    paddingLeft: 4,
    paddingRight: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    maxWidth: 210,
  },
  whoText: { flexShrink: 1 },
  balance: { backgroundColor: colors.surface, height: 34 },
  card: {
    position: 'absolute',
    width: CARD_W,
    alignItems: 'center',
    gap: 2,
    paddingTop: CARD_PAD,
    paddingHorizontal: CARD_PAD,
    paddingBottom: space.sm + 2,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  // A place already visited with this partner.
  cardBeen: { borderColor: colors.bond },
  cardLocked: { opacity: 0.75 },
  art: {
    width: CARD_W - CARD_PAD * 2 - 4,
    height: ART_H,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  dim: { opacity: 0.5 },
  lock: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  people: { flexDirection: 'row', flexWrap: 'wrap', gap: space.lg, paddingBottom: space.lg },
  person: { alignItems: 'center', gap: space.xs, width: 68 },
  place: { gap: space.lg },
  hero: { height: 160, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  facts: { flexDirection: 'row', gap: space.sm },
  fact: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: space.md, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt },
  factValue: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
