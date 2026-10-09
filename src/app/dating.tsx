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

const TILE = 84;
const PIN_W = 120;

/**
 * The date map: places to go with one friend. A place opens once the bond is close
 * enough; a tap shows what it costs and starts the date.
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
          ? DATE_PLACES.map((p) => {
              const locked = level < p.levelRequired;
              return (
                <PressableScale
                  key={p.id}
                  scaleTo={0.94}
                  accessibilityLabel={t(`dating.scenarios.${p.titleKey}`)}
                  style={[styles.pin, { left: p.x * map.width, top: p.y * map.height }]}
                  onPress={() => setPlaceId(p.id)}>
                  <View
                    style={[
                      styles.tile,
                      { backgroundColor: p.tint },
                      been.has(p.id) && styles.tileBeen,
                      locked && styles.tileLocked,
                      shadows.card,
                    ]}>
                    <ClayIcon name={p.icon} size={Math.round(TILE * 0.78)} tile={false} />
                  </View>
                  <Txt variant="bodyStrong" center lines={2} color={locked ? colors.textMuted : colors.text}>
                    {t(`dating.places.${p.titleKey}`)}
                  </Txt>
                  <View style={styles.meta}>
                    {locked ? <Ionicons name="lock-closed" size={13} color={colors.textMuted} /> : null}
                    <Txt variant="caption" color={colors.textMuted}>
                      {t('dating.level', { level: p.levelRequired })}
                    </Txt>
                  </View>
                </PressableScale>
              );
            })
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
          <CharacterAvatar character={partner} size={34} />
          <Txt variant="bodyStrong" lines={1}>
            {name}
          </Txt>
          <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
        </PressableScale>
        <View style={styles.grow} />
        <ShellBadge count={shells} />
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + space.lg }]}>
        <Button
          label={t('dating.album', { count: dates.length })}
          variant="secondary"
          size="lg"
          full
          left={<ClayIcon name="polaroids" size={26} tile={false} />}
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

/** A dotted path from place to place, through the middle of each tile, in map order. */
function trail(w: number, h: number) {
  const pts = DATE_PLACES.map((p) => [p.x * w + PIN_W / 2, p.y * h + TILE / 2]);
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
      <Path d={trail(w, h)} fill="none" stroke={palette.cream300} strokeWidth={5} strokeDasharray="2 12" strokeLinecap="round" />
      <Circle cx={w * 0.9} cy={h * 0.47} r={16} fill="#BFE3B4" />
      <Circle cx={w * 0.93} cy={h * 0.455} r={11} fill="#A9D79C" />
      <Circle cx={w * 0.06} cy={h * 0.66} r={13} fill="#BFE3B4" />
      <Circle cx={w * 0.85} cy={h * 0.83} r={14} fill="#A9D79C" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  top: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  round: {
    width: 42,
    height: 42,
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
    paddingLeft: 5,
    paddingRight: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    maxWidth: 200,
  },
  pin: { position: 'absolute', width: PIN_W, alignItems: 'center', gap: 4 },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: radius.xl,
    borderWidth: 4,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileBeen: { borderColor: colors.bond },
  tileLocked: { opacity: 0.45 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  bottom: { position: 'absolute', left: space.lg, right: space.lg, bottom: 0 },
  people: { flexDirection: 'row', flexWrap: 'wrap', gap: space.lg, paddingBottom: space.lg },
  person: { alignItems: 'center', gap: space.xs, width: 68 },
  place: { gap: space.lg },
  hero: { height: 160, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  facts: { flexDirection: 'row', gap: space.sm },
  fact: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: space.md, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt },
  factValue: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
