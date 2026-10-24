import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { artLook, DateTicket, placeLook } from '@/components/date/ticket';
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
import { DATE_PLACES, type DatePlace } from '@/mock/dates';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, isDark, space } from '@/theme';
import type { Character, DateTheme } from '@/types';

/** A closed ticket shows its header strip; an open one (and the last) shows all of it. */
const PEEK = 62;
const FULL = 236;

/** Alert.alert is a no-op on web; fall back to the browser's confirm there (as in group info). */
function confirm(title: string, message: string, action: string, onConfirm: () => void, cancel: string) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: cancel, style: 'cancel' },
    { text: action, style: 'destructive', onPress: onConfirm },
  ]);
}

/**
 * Dates as Apple Wallet event tickets (owner's pick B, canvas "DateWallet", 2026-10-21): the five
 * places and the user's own dates stacked like passes, each showing its name and price (or the
 * level it opens at) while closed. Tap one and it opens with rounds, closeness, who with and
 * Start; past dates sit behind "View past dates", as Wallet hides expired passes. "+" writes
 * your own date. Same rules as the old map: a place opens once the bond is close enough.
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
          actionLabel={t('find.title')}
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

  // The ticket open by default is the newest place this friend can go to.
  const newestOpen = [...DATE_PLACES].reverse().find((p) => p.levelRequired <= level)?.id ?? DATE_PLACES[0].id;
  const current = openId ?? newestOpen;
  const toggle = (id: string) => setOpenId(current === id ? '' : id);

  const tickets: { id: string; label: string; node: React.ReactNode }[] = [
    ...DATE_PLACES.map((p) => {
      const locked = level < p.levelRequired;
      return {
        id: p.id,
        label: t(`dating.places.${p.titleKey}`),
        node: (
          <DateTicket
            look={placeLook(p.id)}
            locked={locked}
            name={t(`dating.places.${p.titleKey}`)}
            headLabel={locked ? t('dating.opensAt') : t('dateTheme.shells')}
            headValue={locked ? t('dating.level', { level: p.levelRequired }) : String(p.cost)}
            kind={t('dating.kindDate')}
            title={t(`dating.scenarios.${p.titleKey}`)}
            fields={[
              { label: t('dateTheme.rounds'), value: String(p.rounds.length) },
              { label: t('dating.closenessLabel'), value: t('dating.level', { level: p.levelRequired }) },
              { label: t('dateTheme.with'), value: name },
            ]}
            footer={
              locked ? (
                <LockedPill label={t('dating.locked', { level: p.levelRequired })} />
              ) : (
                <StartButton label={t('dating.start', { name })} ink={placeLook(p.id).ink} onPress={() => start(p)} />
              )
            }
          />
        ),
      };
    }),
    ...themes.map((d) => {
      const friend = themeFriend(d);
      const friendLevel = friend ? (relationships[friend.id]?.level ?? 0) : 0;
      const open = !!friend && moodOpen(d.mood, friendLevel);
      const look = artLook(d.art);
      return {
        id: d.id,
        label: d.title,
        node: (
          <DateTicket
            look={look}
            locked={!open}
            name={d.title}
            headLabel={open ? t('dateTheme.shells') : t('dating.opensAt')}
            headValue={open ? String(themeCost(d.rounds)) : t('dating.level', { level: MOOD_LEVEL[d.mood] })}
            kind={t('dateTheme.kind')}
            title={d.title}
            fields={[
              { label: t('dateTheme.rounds'), value: String(d.rounds) },
              { label: t('dateTheme.mood'), value: t(`dating.moods.${d.mood}`) },
              { label: t('dateTheme.with'), value: d.characterId && friend ? nameOf(friend) : t('dateTheme.anyone') },
            ]}
            footer={
              <View style={styles.footerRow}>
                <View style={styles.grow}>
                  {open && friend ? (
                    <StartButton label={t('dating.start', { name: nameOf(friend) })} ink={look.ink} onPress={() => startTheme(d)} />
                  ) : (
                    <LockedPill label={friend ? t('dating.locked', { level: MOOD_LEVEL[d.mood] }) : t('dating.noFriends')} />
                  )}
                </View>
                <PressableScale
                  scaleTo={0.9}
                  accessibilityRole="button"
                  accessibilityLabel={t('dating.more')}
                  onPress={() => setMoreId(d.id)}
                  style={styles.more}>
                  <Ionicons name="ellipsis-horizontal" size={20} color={colors.white} />
                </PressableScale>
              </View>
            }
          />
        ),
      };
    }),
  ];

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

        <View style={styles.stack}>
          {tickets.map((ticket, i) => {
            const last = i === tickets.length - 1;
            const open = ticket.id === current;
            return (
              <View key={ticket.id} style={[styles.slot, { height: open || last ? FULL + 10 : PEEK }]}>
                <View style={styles.ticket}>
                  {ticket.node}
                  {/* The header strip opens and closes the ticket; its buttons stay their own. */}
                  <Pressable
                    onPress={() => toggle(ticket.id)}
                    accessibilityRole="button"
                    accessibilityLabel={ticket.label}
                    accessibilityState={{ expanded: open || last }}
                    style={styles.headTap}
                  />
                </View>
              </View>
            );
          })}
        </View>

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

      <Sheet visible={choosing} onClose={() => setChoosing(false)} title={t('dating.choosePartner')}>
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

/** The ticket's white button, its text in the ticket's ink. */
function StartButton({ label, ink, onPress }: { label: string; ink: string; onPress: () => void }) {
  return (
    <PressableScale scaleTo={0.97} accessibilityRole="button" onPress={onPress} style={styles.start}>
      <Txt style={[styles.startText, { color: ink }]} lines={1}>
        {label}
      </Txt>
    </PressableScale>
  );
}

function LockedPill({ label }: { label: string }) {
  return (
    <View style={styles.lockedPill}>
      <Ionicons name="lock-closed-outline" size={15} color={colors.white} />
      <Txt style={styles.lockedText} lines={1}>
        {label}
      </Txt>
    </View>
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
  stack: { marginHorizontal: space.lg },
  slot: { position: 'relative' },
  // Each ticket overlaps the one above it, as Wallet stacks passes.
  ticket: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    borderRadius: 16,
    shadowColor: colors.black,
    shadowOpacity: 0.14,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: -4 },
    elevation: 4,
  },
  headTap: { position: 'absolute', left: 0, right: 0, top: 0, height: PEEK },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  start: { height: 44, borderRadius: 22, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.md },
  startText: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  lockedPill: {
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: space.md,
  },
  lockedText: { fontSize: 16, fontWeight: '600', color: colors.white },
  more: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  past: { alignSelf: 'center', marginTop: 14, paddingHorizontal: 18, gap: 8 },
  pastText: { fontSize: 15, fontWeight: '600', color: colors.text },
  people: { flexDirection: 'row', flexWrap: 'wrap', gap: space.lg, justifyContent: 'center', paddingVertical: space.md },
  person: { alignItems: 'center', gap: space.xs, width: 72 },
  moreActions: { gap: space.sm, paddingVertical: space.sm },
});
