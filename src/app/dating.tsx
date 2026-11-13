import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LinearGradient } from 'expo-linear-gradient';
import { PaywallSheet } from '@/components/paywall-sheet';
import {
  BackButton,
  Button,
  CharacterAvatar,
  EmptyState,
  GlassButton,
  LargeTitle,
  PressableScale,
  Screen,
  Sheet,
  ShellIcon,
  Txt,
} from '@/components/ui';
import { moodOpen, MOOD_LEVEL, themeCost } from '@/lib/date-themes';
import { shortName } from '@/lib/format';
import { localized } from '@/i18n/content';
import { DATE_PLACES, type DatePlace } from '@/mock/dates';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, fonts, isDark, space } from '@/theme';
import type { Character, DateTheme } from '@/types';
import { confirmAlert as confirm } from '@/lib/alert';

/**
 * The places as soft tiles (owner, 2026-11-13, the Ink canvas "Where to"; replaces the Wallet
 * tickets): calm tints like Today's widgets, deep at night and pale by day, never loud. By place:
 * sky, sea, sun, dusk, night, rose; the user's own dates follow.
 */
const TILES = isDark
  ? [
      ['#22364C', '#1B2C40'],
      ['#183B39', '#14312F'],
      ['#3E3322', '#342A1B'],
      ['#2E2944', '#272239'],
      ['#25294A', '#1F233F'],
      ['#40263A', '#361F31'],
    ]
  : [
      ['#DDEBFA', '#CEE0F6'],
      ['#D7F0EC', '#C7E8E2'],
      ['#FBEDCB', '#F5E1B2'],
      ['#E7E1F7', '#DAD2F2'],
      ['#DFE1F5', '#D1D4EF'],
      ['#F8DFEC', '#F0CFE0'],
    ];
const INK = isDark ? '#FFFFFF' : '#1F1A17';
const INK_SOFT = isDark ? 'rgba(255,255,255,0.66)' : 'rgba(31,26,23,0.6)';

/**
 * Dates: the places and the user's own dates as a grid of soft tiles (the Ink canvas, owner
 * 2026-11-13), each with its name in serif and its rounds and price, or the level it opens at.
 * A tap picks one (ringed); the button under the grid starts it with the chosen friend, or says
 * what level it needs. Your own date gets "…" (edit, delete) beside the button. Past dates sit
 * behind "View past dates"; "+" writes your own date. A place opens once the bond is close enough.
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
      <Screen background={colors.bg}>
        <View style={styles.bar}>
          <BackButton />
        </View>
        <LargeTitle>{t('dating.walletTitle')}</LargeTitle>
        <EmptyState
          title={t('dating.noFriends')}
          actionLabel={t('common.findSomeone')}
          onAction={() => router.push('/(tabs)/find')}
        />
      </Screen>
    );
  }

  const level = relationships[partner.id]?.level ?? 0;
  const nameOf = (c: Character) => shortName(displayName(c, relationships[c.id]));
  const name = nameOf(partner);
  // A date written for one friend plays with them; any other plays with the chosen partner.
  const themeFriend = (d: DateTheme) => (d.characterId ? known.find((c) => c.id === d.characterId) : partner);

  const start = (p: DatePlace) => {
    const result = beginDate(partner.id, p.id);
    if (result === 'noShells') return setPaywall(p.cost);
    if (result !== 'ok') return;
    router.push({ pathname: '/date/[placeId]', params: { placeId: p.id, characterId: partner.id } });
  };

  const startTheme = (d: DateTheme) => {
    const friend = themeFriend(d);
    if (!friend) return;
    const result = beginThemeDate(friend.id, d.id);
    if (result === 'noShells') return setPaywall(themeCost(d.rounds));
    if (result !== 'ok') return;
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

  type Tile = { id: string; name: string; locked: boolean; rounds: number; cost: number; needs: number; hue: readonly string[]; begin: () => void; theme?: DateTheme; friend?: Character };
  const tiles: Tile[] = [
    ...places.map((p, i) => ({
      id: p.id,
      name: t(`dating.places.${p.titleKey}`),
      locked: level < p.levelRequired,
      rounds: p.rounds.length,
      cost: p.cost,
      needs: p.levelRequired,
      hue: TILES[i % TILES.length],
      begin: () => start(p),
    })),
    ...themes.map((d, i) => {
      const friend = themeFriend(d);
      const friendLevel = friend ? (relationships[friend.id]?.level ?? 0) : 0;
      return {
        id: d.id,
        name: d.title,
        locked: !friend || !moodOpen(d.mood, friendLevel),
        rounds: d.rounds,
        cost: themeCost(d.rounds),
        needs: MOOD_LEVEL[d.mood],
        hue: TILES[(places.length + i) % TILES.length],
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
    <Screen background={colors.bg}>
      <View style={styles.bar}>
        <BackButton />
        <GlassButton
          icon="add"
          accessibilityLabel={t('dating.make')}
          onPress={() => router.push({ pathname: '/date/theme', params: { partner: partner.id } })}
        />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + space.huge }}>
        <LargeTitle>{t('dating.walletTitle')}</LargeTitle>

        <View style={styles.pills}>
          <PressableScale
            scaleTo={0.95}
            accessibilityRole="button"
            accessibilityLabel={t('dating.choosePartner')}
            onPress={() => setChoosing(true)}
            style={[styles.pill, styles.partner]}>
            <CharacterAvatar character={partner} size={32} />
            <Txt style={styles.partnerName} lines={1}>
              {name}
            </Txt>
            <View style={styles.level}>
              <Ionicons name="heart" size={12} color={colors.bondText} />
              <Txt style={styles.levelText}>{level}</Txt>
            </View>
            <Ionicons name="chevron-down" size={13} color={colors.textSecondary} />
          </PressableScale>
          <View style={styles.grow} />
          <View style={[styles.pill, styles.shells]} accessible accessibilityLabel={`${shells}`}>
            <ShellIcon size={18} />
            <Txt style={styles.shellsText}>{shells}</Txt>
          </View>
        </View>

        <View style={styles.tiles}>
          {tiles.map((tile) => {
            const on = tile.id === picked?.id;
            const meta = tile.locked ? t('dating.locked', { level: tile.needs }) : `${tile.rounds} ${t('dating.rounds')} · ${tile.cost}`;
            return (
              <PressableScale
                key={tile.id}
                scaleTo={0.96}
                haptic
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${tile.name}, ${meta}`}
                onPress={() => setOpenId(tile.id)}
                style={[styles.tileWrap, on && styles.tileOn]}>
                <LinearGradient colors={tile.hue as [string, string]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.tile}>
                  <Text style={[styles.tileName, tile.locked && styles.tileLocked]} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.2}>
                    {tile.name}
                  </Text>
                  <View style={styles.tileMeta}>
                    {tile.locked ? <Ionicons name="lock-closed" size={12} color={INK_SOFT} /> : null}
                    <Text style={styles.tileMetaText} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                      {meta}
                    </Text>
                    {tile.locked ? null : <ShellIcon size={13} />}
                  </View>
                </LinearGradient>
              </PressableScale>
            );
          })}
        </View>

        {picked ? (
          <View style={styles.go}>
            {picked.locked ? (
              <View style={[styles.goButton, styles.goLocked]}>
                <Ionicons name="lock-closed" size={15} color={colors.textSecondary} />
                <Txt style={styles.goLockedText} lines={1}>
                  {pickedWith ? t('dating.locked', { level: picked.needs }) : t('dating.noFriends')}
                </Txt>
              </View>
            ) : (
              <PressableScale scaleTo={0.97} accessibilityRole="button" onPress={picked.begin} style={[styles.goButton, styles.grow]}>
                <Txt style={styles.goText} lines={1}>
                  {t('dating.start', { name: pickedWith ? nameOf(pickedWith) : name })}
                </Txt>
              </PressableScale>
            )}
            {picked.theme ? (
              <PressableScale scaleTo={0.9} accessibilityRole="button" accessibilityLabel={t('dating.more')} onPress={() => setMoreId(picked.id)} style={styles.more}>
                <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
              </PressableScale>
            ) : null}
          </View>
        ) : null}

        {dates.length > 0 ? (
          <PressableScale
            scaleTo={0.95}
            accessibilityRole="button"
            onPress={() => router.push('/date/album')}
            style={[styles.pill, styles.past]}>
            <Ionicons name="images-outline" size={18} color={colors.text} />
            <Txt style={styles.pastText}>{t('dating.pastDates', { count: dates.length })}</Txt>
          </PressableScale>
        ) : null}
      </ScrollView>

      <Sheet visible={choosing} onClose={() => setChoosing(false)} title={t('dating.choosePartner')} scroll>
        <View style={styles.people}>
          {known.map((c) => (
            <PressableScale
              key={c.id}
              style={styles.person}
              scaleTo={0.94}
              onPress={() => {
                setPartnerId(c.id);
                setOpenId(null);
                setChoosing(false);
              }}>
              <CharacterAvatar character={c} size={60} ring={c.id === partner.id} ringColor={colors.text} />
              <Txt variant="smallStrong" lines={1} color={c.id === partner.id ? colors.text : colors.textMuted}>
                {nameOf(c)}
              </Txt>
            </PressableScale>
          ))}
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
  grow: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: space.xs,
    paddingBottom: space.sm,
  },
  pills: { marginTop: 12, marginBottom: 18, marginHorizontal: space.lg, flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: {
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    ...(isDark
      ? { borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.08)' }
      : { shadowColor: colors.black, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 }),
  },
  partner: { paddingLeft: 4, paddingRight: 12, gap: 8, maxWidth: 240 },
  partnerName: { flexShrink: 1, fontSize: 15, fontWeight: '600', letterSpacing: -0.2, color: colors.text },
  level: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  levelText: { fontSize: 13, fontWeight: '700', color: colors.bondText },
  shells: { paddingLeft: 10, paddingRight: 14, gap: 6 },
  shellsText: { fontSize: 15, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  // The canvas's tiles, two a row; the picked one ringed in the label colour.
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginHorizontal: space.lg },
  tileWrap: { width: '47.5%', aspectRatio: 1, borderRadius: 34, borderCurve: 'continuous', padding: 3, borderWidth: 2, borderColor: 'transparent' },
  tileOn: { borderColor: colors.text },
  tile: { flex: 1, borderRadius: 30, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  tileName: { fontFamily: fonts.serif, fontSize: 23, lineHeight: 28, letterSpacing: -0.3, color: INK, textAlign: 'center' },
  tileLocked: { opacity: 0.6 },
  tileMeta: { position: 'absolute', bottom: 14, left: 10, right: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  tileMetaText: { flexShrink: 1, fontSize: 13.5, color: INK_SOFT, fontVariant: ['tabular-nums'] },
  go: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20, marginHorizontal: space.lg },
  goButton: { height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.md, backgroundColor: colors.text },
  goText: { fontSize: 16, fontWeight: '600', color: colors.bg },
  goLocked: { flex: 1, flexDirection: 'row', gap: 6, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
  goLockedText: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },
  more: { width: 54, height: 54, borderRadius: 27, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' },
  past: { alignSelf: 'center', marginTop: 14, paddingHorizontal: 18, gap: 8 },
  pastText: { fontSize: 15, fontWeight: '600', color: colors.text },
  people: { flexDirection: 'row', flexWrap: 'wrap', gap: space.lg, justifyContent: 'center', paddingVertical: space.md },
  person: { alignItems: 'center', gap: space.xs, width: 72 },
  moreActions: { gap: space.sm, paddingVertical: space.sm },
});
