import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InkGlassPill, InkIconButton, InkNavBar, InkText, PillButton, tileTint } from '@/components/ink';
import { PaywallSheet } from '@/components/paywall-sheet';
import {
  Button,
  CharacterAvatar,
  EmptyState,
  PressableScale,
  Screen,
  Sheet,
  ShellIcon,
  Txt,
  useScrolledPast,
} from '@/components/ui';
import { useCountingNumber } from '@/hooks/use-counting-number';
import { localized } from '@/i18n/content';
import { confirmAlert as confirm } from '@/lib/alert';
import { moodOpen, MOOD_LEVEL, themeCost } from '@/lib/date-themes';
import { count, shortName } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { DATE_PLACES, type DatePlace } from '@/mock/dates';
import { displayName, useAppStore } from '@/store/use-app-store';
import { bottomRoom, colors, friendAccent, space } from '@/theme';
import { ink, inkGutter, inkRadius } from '@/theme/ink';
import type { Character, DateTheme } from '@/types';

const BOND_MINT = '#5FE0C4';
const DOCK_BG = 'rgba(9,9,13,0.94)';
const PILL_BG = 'rgba(22,22,30,0.84)';
const GLASS_RIM = 'rgba(255,255,255,0.12)';

const PLACE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  rainyStreet: 'rainy',
  rain: 'rainy',
  aquarium: 'water',
  festival: 'sparkles',
  summerFestival: 'sparkles',
  studio: 'musical-notes',
  lateStudio: 'musical-notes',
  rooftop: 'moon',
  cafe: 'cafe',
  nightWalk: 'moon',
};

function iconForPlace(titleKey?: string): keyof typeof Ionicons.glyphMap {
  if (!titleKey) return 'heart';
  if (PLACE_ICON[titleKey]) return PLACE_ICON[titleKey];
  const lower = titleKey.toLowerCase();
  if (lower.includes('rain')) return 'rainy';
  if (lower.includes('aqua') || lower.includes('sea') || lower.includes('beach')) return 'water';
  if (lower.includes('fest') || lower.includes('park') || lower.includes('star')) return 'sparkles';
  if (lower.includes('music') || lower.includes('studio') || lower.includes('record')) return 'musical-notes';
  if (lower.includes('roof') || lower.includes('night') || lower.includes('moon')) return 'moon';
  return 'heart';
}

/**
 * Dates (approved Ink Night+ prototype): pinned sticky Apple HIG nav bar with shell counter + "+",
 * Display serif title paired with a ringed friend-selector pill, 2-column stained-glass place tiles
 * (icon badge, lock or warm peach active dot, serif title, tabular rounds/cost), past-dates capsule,
 * and an anchored Start Date bottom dock.
 */
export default function DatingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { scrolled, onScroll } = useScrolledPast(34);

  const shells = useAppStore((s) => s.wallet.shells);
  const shownShells = useCountingNumber(shells);
  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);
  const conversations = useAppStore((s) => s.conversations);
  const dates = useAppStore((s) => s.dates);
  const beginDate = useAppStore((s) => s.beginDate);
  const themes = useAppStore((s) => s.dateThemes);
  const beginThemeDate = useAppStore((s) => s.beginThemeDate);
  const deleteDateTheme = useAppStore((s) => s.deleteDateTheme);

  const known = useMemo(
    () =>
      characters
        .filter((c) => relationships[c.id] && conversations.some((v) => v.characterId === c.id))
        .sort((a, b) => relationships[b.id].intimacy - relationships[a.id].intimacy),
    [characters, relationships, conversations],
  );

  // A group chat opens the map with the member the user picked there.
  const { partner: asked } = useLocalSearchParams<{ partner?: string }>();
  const [partnerId, setPartnerId] = useState(
    typeof asked === 'string' && known.some((c) => c.id === asked) ? asked : known[0]?.id,
  );
  const [choosing, setChoosing] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [moreId, setMoreId] = useState<string | null>(null);
  const [paywall, setPaywall] = useState<number | null>(null);

  const partner = known.find((c) => c.id === partnerId) ?? known[0];

  if (!partner) {
    return (
      <Screen background={ink.ground}>
        <InkNavBar backLabel={t('a11y.back')} onBack={() => router.back()} />
        <InkText variant="display" style={styles.emptyTitle}>
          {t('dating.walletTitle')}
        </InkText>
        <EmptyState
          symbol={{ ios: 'heart.circle', icon: 'heart-circle-outline' }}
          title={t('dating.noFriends')}
          actionLabel={t('common.findSomeone')}
          onAction={() => router.push('/(tabs)/find')}
        />
      </Screen>
    );
  }

  const level = relationships[partner.id]?.level ?? 0;
  const partnerAccent = friendAccent(partner.id).strong;
  const nameOf = (c: Character) => shortName(displayName(c, relationships[c.id]));
  const name = nameOf(partner);
  // A date written for one friend plays with them; any other plays with the chosen partner.
  const themeFriend = (d: DateTheme) => (d.characterId ? known.find((c) => c.id === d.characterId) : partner);

  const start = (p: DatePlace) => {
    const result = beginDate(partner.id, p.id);
    if (result === 'noShells') return setPaywall(p.cost);
    if (result !== 'ok') return;
    haptic.success();
    router.push({ pathname: '/date/[placeId]', params: { placeId: p.id, characterId: partner.id } });
  };

  const startTheme = (d: DateTheme) => {
    const friend = themeFriend(d);
    if (!friend) return;
    const result = beginThemeDate(friend.id, d.id);
    if (result === 'noShells') return setPaywall(themeCost(d.rounds));
    if (result !== 'ok') return;
    haptic.success();
    router.push({ pathname: '/date/[placeId]', params: { placeId: d.id, characterId: friend.id } });
  };

  const removeTheme = (d: DateTheme) =>
    confirm(
      t('dating.deleteTitle'),
      t('dating.deleteBody'),
      t('dating.delete'),
      () => {
        setMoreId(null);
        deleteDateTheme(d.id);
      },
      t('common.cancel'),
    );

  // Picked by default: the newest place this friend can go to.
  const places = localized('datePlaces', DATE_PLACES);
  const newestOpen = [...places].reverse().find((p) => p.levelRequired <= level)?.id ?? places[0].id;
  const current = openId ?? newestOpen;

  type DateTileItem = {
    id: string;
    name: string;
    icon: keyof typeof Ionicons.glyphMap;
    locked: boolean;
    rounds: number;
    cost: number;
    needs: number;
    tint: readonly [string, string];
    begin: () => void;
    theme?: DateTheme;
    friend?: Character;
  };

  const tiles: DateTileItem[] = [
    ...places.map((p, i) => ({
      id: p.id,
      name: t(`dating.places.${p.titleKey}`),
      icon: iconForPlace(p.titleKey),
      locked: level < p.levelRequired,
      rounds: p.rounds.length,
      cost: p.cost,
      needs: p.levelRequired,
      tint: tileTint(i),
      begin: () => start(p),
    })),
    ...themes.map((d, i) => {
      const friend = themeFriend(d);
      const friendLevel = friend ? (relationships[friend.id]?.level ?? 0) : 0;
      return {
        id: d.id,
        name: d.title,
        icon: 'sparkles' as const,
        locked: !friend || !moodOpen(d.mood, friendLevel),
        rounds: d.rounds,
        cost: themeCost(d.rounds),
        needs: MOOD_LEVEL[d.mood],
        tint: tileTint(places.length + i),
        begin: () => startTheme(d),
        theme: d,
        friend,
      };
    }),
  ];
  const picked = tiles.find((x) => x.id === current) ?? tiles[0];
  const pickedWith = picked?.theme ? picked.friend : partner;
  const moreTheme = themes.find((d) => d.id === moreId);

  return (
    <Screen background={ink.ground}>
      <LinearGradient
        pointerEvents="none"
        colors={[`${partnerAccent}26`, `${partnerAccent}00`]}
        start={{ x: 0.75, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.ambient}
      />

      <InkNavBar
        backLabel={t('a11y.back')}
        onBack={() => router.back()}
        title={t('dating.walletTitle')}
        scrolled={scrolled}
        right={
          <View style={styles.barRight}>
            <View style={styles.shellsPill} accessible accessibilityLabel={`${shells}`}>
              <ShellIcon size={16} />
              <InkText variant="footnoteStrong" color={ink.text} style={styles.figure}>
                {count(shownShells)}
              </InkText>
            </View>
            <InkIconButton
              icon="add"
              size={22}
              accessibilityLabel={t('dating.make')}
              onPress={() => router.push({ pathname: '/date/theme', params: { partner: partner.id } })}
            />
          </View>
        }
      />

      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 116 }}>
        <View style={styles.headRow}>
          <InkText variant="display" accessibilityRole="header" style={styles.headTitle} lines={1} adjustsFontSizeToFit minimumFontScale={0.78}>
            {t('dating.walletTitle')}
          </InkText>
          <PressableScale
            scaleTo={0.95}
            accessibilityRole="button"
            accessibilityLabel={t('dating.choosePartner')}
            onPress={() => setChoosing(true)}
            style={styles.partnerPill}>
            <View style={[styles.partnerRing, { borderColor: partnerAccent }]}>
              <CharacterAvatar character={partner} size={26} />
            </View>
            <InkText variant="footnoteStrong" color={ink.text} lines={1} style={styles.partnerName}>
              {name}
            </InkText>
            <View style={styles.level}>
              <Ionicons name="heart" size={11} color={BOND_MINT} />
              <InkText variant="caption" color={BOND_MINT} style={styles.figure}>
                {String(level)}
              </InkText>
            </View>
            <Ionicons name="chevron-down" size={13} color={ink.text2} />
          </PressableScale>
        </View>

        <View style={styles.tiles}>
          {tiles.map((tile) => {
            const isPicked = tile.id === picked?.id;
            const meta = tile.locked ? t('dating.level', { level: tile.needs }) : `${tile.rounds} ${t('dating.rounds')} · ${tile.cost}`;
            const spoken = tile.locked ? t('dating.locked', { level: tile.needs }) : meta;
            return (
              <PressableScale
                key={tile.id}
                scaleTo={0.97}
                accessibilityRole="button"
                accessibilityLabel={`${tile.name}, ${spoken}`}
                accessibilityState={{ selected: isPicked }}
                onPress={() => {
                  if (!isPicked) haptic.selection();
                  setOpenId(tile.id);
                }}
                style={[
                  styles.tile,
                  tile.locked && styles.tileLocked,
                  isPicked && (tile.locked ? styles.tilePickedLocked : styles.tilePicked),
                ]}>
                <LinearGradient
                  colors={tile.tint}
                  start={{ x: 0.1, y: 0 }}
                  end={{ x: 0.9, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.tileTop}>
                  <View style={styles.tileIconBadge}>
                    <Ionicons name={tile.icon} size={16} color="rgba(255,255,255,0.90)" />
                  </View>
                  {/* Picked: the app's selected state, a peach check (audit #9; was a white rim and a dot). */}
                  {isPicked && !tile.locked ? (
                    <View style={styles.pickedCheck}>
                      <Ionicons name="checkmark" size={14} color={ink.onAccent} />
                    </View>
                  ) : null}
                </View>

                <View>
                  <InkText variant="cardSmall" color={ink.text} lines={2} wordSafe>
                    {tile.name}
                  </InkText>
                  {tile.locked ? (
                    // Locked: the level it opens at, big enough to read at a glance, beside the lock.
                    <View style={styles.tileMeta}>
                      <Ionicons name="lock-closed" size={15} color={ink.text} />
                      <InkText variant="bodyStrong" color={ink.text} lines={1} style={styles.figure}>
                        {meta}
                      </InkText>
                    </View>
                  ) : (
                    <View style={styles.tileMeta}>
                      <InkText variant="caption" color="rgba(255,255,255,0.68)" lines={1} style={styles.figure}>
                        {meta}
                      </InkText>
                      <ShellIcon size={12} />
                    </View>
                  )}
                </View>
              </PressableScale>
            );
          })}
        </View>

        {dates.length > 0 ? (
          <View style={styles.pastWrap}>
            <InkGlassPill
              icon="images-outline"
              label={t('dating.pastDates', { count: dates.length })}
              onPress={() => router.push('/date/album')}
              style={styles.pastPill}
            />
          </View>
        ) : null}
      </ScrollView>

      {picked ? (
        <View style={[styles.dock, { paddingBottom: bottomRoom(insets.bottom, space.md) }]}>
          <View style={styles.dockRow}>
            <PillButton
              style={styles.grow}
              disabled={picked.locked}
              icon={picked.locked ? 'lock-closed' : undefined}
              label={
                picked.locked
                  ? pickedWith
                    ? t('dating.locked', { level: picked.needs })
                    : t('dating.noFriends')
                  : t('dating.start', { name: pickedWith ? nameOf(pickedWith) : name })
              }
              onPress={picked.begin}
            />
            {picked.theme ? (
              <PressableScale
                scaleTo={0.92}
                accessibilityRole="button"
                accessibilityLabel={t('dating.more')}
                onPress={() => setMoreId(picked.id)}
                style={styles.more}>
                <Ionicons name="ellipsis-horizontal" size={20} color={ink.text} />
              </PressableScale>
            ) : null}
          </View>
        </View>
      ) : null}

      <Sheet visible={choosing} onClose={() => setChoosing(false)} title={t('dating.choosePartner')} scroll>
        <View style={styles.people}>
          {known.map((c) => {
            const on = c.id === partner.id;
            const cAccent = friendAccent(c.id).strong;
            const cLv = relationships[c.id]?.level ?? 0;
            return (
              <PressableScale
                key={c.id}
                style={styles.person}
                scaleTo={0.94}
                onPress={() => {
                  setPartnerId(c.id);
                  setOpenId(null);
                  setChoosing(false);
                }}>
                <View style={[styles.sheetRing, { borderColor: on ? cAccent : 'transparent' }]}>
                  <CharacterAvatar character={c} size={56} />
                </View>
                <Txt variant="smallStrong" lines={1} color={on ? ink.text : ink.text2}>
                  {nameOf(c)}
                </Txt>
                <InkText variant="caption" color={BOND_MINT} style={styles.figure}>
                  {t('dating.level', { level: cLv })}
                </InkText>
              </PressableScale>
            );
          })}
        </View>
      </Sheet>

      <Sheet visible={!!moreTheme} onClose={() => setMoreId(null)} title={moreTheme?.title}>
        {moreTheme ? (
          <View style={styles.moreActions}>
            <Button
              label={t('dating.edit')}
              variant="secondary"
              full
              onPress={() => {
                setMoreId(null);
                router.push({ pathname: '/date/theme', params: { id: moreTheme.id, partner: partner.id } });
              }}
            />
            <Button label={t('dating.delete')} variant="ghost" full onPress={() => removeTheme(moreTheme)} />
          </View>
        ) : null}
      </Sheet>

      <PaywallSheet need={paywall} onClose={() => setPaywall(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  ambient: { position: 'absolute', top: 0, left: 0, right: 0, height: 220 },
  grow: { flex: 1 },
  emptyTitle: { marginTop: 4, marginHorizontal: inkGutter },
  barRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  shellsPill: {
    height: 36,
    paddingHorizontal: 11,
    borderRadius: inkRadius.pill,
    backgroundColor: ink.raised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_RIM,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  headRow: {
    marginTop: 2,
    marginHorizontal: inkGutter,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
  },
  headTitle: { flexShrink: 1 },
  partnerPill: {
    height: 38,
    maxWidth: '58%',
    paddingLeft: 4,
    paddingRight: 10,
    borderRadius: inkRadius.pill,
    borderCurve: 'continuous',
    backgroundColor: PILL_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_RIM,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  partnerRing: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  partnerName: { flexShrink: 1 },
  level: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  figure: { fontVariant: ['tabular-nums'], flexShrink: 1 },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 11,
    marginTop: 18,
    marginHorizontal: inkGutter,
  },
  tile: {
    width: '48.2%',
    aspectRatio: 1.02,
    borderRadius: 26,
    borderCurve: 'continuous',
    overflow: 'hidden',
    padding: 14,
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  tileLocked: { opacity: 0.5 },
  tilePicked: { borderWidth: 2, borderColor: ink.accent },
  tilePickedLocked: { borderWidth: 2, borderColor: ink.text3 },
  tileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tileIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 11,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(9,9,13,0.34)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_RIM,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickedCheck: { width: 24, height: 24, borderRadius: 12, backgroundColor: ink.accent, alignItems: 'center', justifyContent: 'center' },
  tileMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  pastWrap: { alignItems: 'center', marginTop: 18 },
  pastPill: { height: 38, paddingHorizontal: 15 },
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    paddingHorizontal: inkGutter,
    backgroundColor: DOCK_BG,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ink.edge,
  },
  dockRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  more: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: ink.raised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_RIM,
    alignItems: 'center',
    justifyContent: 'center',
  },
  people: { flexDirection: 'row', flexWrap: 'wrap', gap: space.lg, justifyContent: 'center', paddingVertical: space.md },
  person: { alignItems: 'center', gap: 5, width: 76 },
  sheetRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  moreActions: { gap: space.sm, paddingVertical: space.sm },
});
