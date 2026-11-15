import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InkText, PillButton, Tile, tileTint } from '@/components/ink';
import { PaywallSheet } from '@/components/paywall-sheet';
import {
  BackButton,
  Button,
  CharacterAvatar,
  EmptyState,
  GlassButton,
  PressableScale,
  Screen,
  Sheet,
  ShellIcon,
  Txt,
} from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { moodOpen, MOOD_LEVEL, themeCost } from '@/lib/date-themes';
import { shortName } from '@/lib/format';
import { localized } from '@/i18n/content';
import { DATE_PLACES, type DatePlace } from '@/mock/dates';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, space } from '@/theme';
import { ink, inkGutter, inkRadius } from '@/theme/ink';
import type { Character, DateTheme } from '@/types';
import { confirmAlert as confirm } from '@/lib/alert';

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
      <Screen background={ink.ground}>
        <View style={styles.bar}>
          <BackButton />
        </View>
        <InkText variant="display" style={styles.title}>
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

  type DateTile = { id: string; name: string; locked: boolean; rounds: number; cost: number; needs: number; tint: readonly [string, string]; begin: () => void; theme?: DateTheme; friend?: Character };
  const tiles: DateTile[] = [
    ...places.map((p, i) => ({
      id: p.id,
      name: t(`dating.places.${p.titleKey}`),
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
      <View style={styles.bar}>
        <BackButton />
        <GlassButton
          icon="add"
          accessibilityLabel={t('dating.make')}
          onPress={() => router.push({ pathname: '/date/theme', params: { partner: partner.id } })}
        />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + space.huge }}>
        <InkText variant="display" style={styles.title}>
          {t('dating.walletTitle')}
        </InkText>

        <View style={styles.pills}>
          <PressableScale
            scaleTo={0.95}
            accessibilityRole="button"
            accessibilityLabel={t('dating.choosePartner')}
            onPress={() => setChoosing(true)}
            style={[styles.pill, styles.partner]}>
            <CharacterAvatar character={partner} size={32} />
            <InkText variant="subStrong" lines={1} style={styles.partnerName}>
              {name}
            </InkText>
            <View style={styles.level}>
              <Ionicons name="heart" size={12} color={colors.bondText} />
              <InkText variant="footnote" color={colors.bondText} style={styles.figure}>
                {String(level)}
              </InkText>
            </View>
            <Ionicons name="chevron-down" size={13} color={ink.text2} />
          </PressableScale>
          <View style={styles.grow} />
          <View style={[styles.pill, styles.shells]} accessible accessibilityLabel={`${shells}`}>
            <ShellIcon size={18} />
            <InkText variant="subStrong" style={styles.figure}>
              {String(shells)}
            </InkText>
          </View>
        </View>

        <View style={styles.tiles}>
          {tiles.map((tile) => {
            // On the tile the short form beside the lock ("🔒 Lv 6"); the full "Reach level 6" is on the button and read aloud.
            const meta = tile.locked ? t('dating.level', { level: tile.needs }) : `${tile.rounds} ${t('dating.rounds')} · ${tile.cost}`;
            const spoken = tile.locked ? t('dating.locked', { level: tile.needs }) : meta;
            return (
              <Tile
                key={tile.id}
                tint={tile.tint}
                name={tile.name}
                dimmed={tile.locked}
                picked={tile.id === picked?.id}
                accessibilityLabel={`${tile.name}, ${spoken}`}
                onPress={() => {
                  if (tile.id !== picked?.id) haptic.selection();
                  setOpenId(tile.id);
                }}
                meta={
                  <>
                    {tile.locked ? <Ionicons name="lock-closed" size={12} color={ink.text2} /> : null}
                    <InkText variant="footnote" lines={1} style={styles.figure}>
                      {meta}
                    </InkText>
                    {tile.locked ? null : <ShellIcon size={13} />}
                  </>
                }
              />
            );
          })}
        </View>

        {picked ? (
          <View style={styles.go}>
            <PillButton
              style={styles.grow}
              disabled={picked.locked}
              icon={picked.locked ? 'lock-closed' : undefined}
              label={picked.locked ? (pickedWith ? t('dating.locked', { level: picked.needs }) : t('dating.noFriends')) : t('dating.start', { name: pickedWith ? nameOf(pickedWith) : name })}
              onPress={picked.begin}
            />
            {picked.theme ? (
              <PressableScale scaleTo={0.9} accessibilityRole="button" accessibilityLabel={t('dating.more')} onPress={() => setMoreId(picked.id)} style={styles.more}>
                <Ionicons name="ellipsis-horizontal" size={20} color={ink.text} />
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
            <Ionicons name="images-outline" size={18} color={ink.text} />
            <InkText variant="subStrong">{t('dating.pastDates', { count: dates.length })}</InkText>
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
  title: { marginTop: 4, marginHorizontal: inkGutter },
  pills: { marginTop: 12, marginBottom: 18, marginHorizontal: inkGutter, flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: { minHeight: 44, borderRadius: inkRadius.pill, backgroundColor: ink.raised, flexDirection: 'row', alignItems: 'center' },
  partner: { paddingLeft: 6, paddingRight: 12, gap: 8, maxWidth: 240 },
  partnerName: { flexShrink: 1 },
  level: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  figure: { fontVariant: ['tabular-nums'], flexShrink: 1 },
  shells: { paddingLeft: 10, paddingRight: 14, gap: 6 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginHorizontal: inkGutter },
  go: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20, marginHorizontal: inkGutter },
  more: { width: 56, height: 56, borderRadius: inkRadius.pill, backgroundColor: ink.raised, alignItems: 'center', justifyContent: 'center' },
  past: { alignSelf: 'center', marginTop: 14, paddingHorizontal: 18, gap: 8 },
  people: { flexDirection: 'row', flexWrap: 'wrap', gap: space.lg, justifyContent: 'center', paddingVertical: space.md },
  person: { alignItems: 'center', gap: space.xs, width: 72 },
  moreActions: { gap: space.sm, paddingVertical: space.sm },
});
