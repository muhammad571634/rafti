import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LoreInfoButton, servesLine } from '@/components/lore/lore-rows';
import { AddRow, GlassBar, GlassButton, PressableScale, Screen, Txt, useScrolledPast } from '@/components/ui';
import { perkLimit, PERKS, planWouldAllowMore } from '@/economy/perks';
import { phrase } from '@/i18n';
import { localized } from '@/i18n/content';
import { LORE_KINDS } from '@/lib/lorebook';
import { officialLorebooks } from '@/mock/lorebooks';
import { useAppStore } from '@/store/use-app-store';
import { colors, fonts, isDark, space, systemGround } from '@/theme';
import type { LoreEntry, LoreKind, Lorebook } from '@/types';

/** A book's tile colours by its place in the shelf (the Ink canvas: sky, amber, then on). */
const TILE_HUES = [
  ['#5AC8FA', '#6E8BFF'],
  ['#F8C13F', '#E8A93A'],
  ['#FF8A80', '#FF5E62'],
  ['#4FD1A0', '#2BB37F'],
  ['#B39DFF', '#8E7CF0'],
  ['#FFB27A', '#F08A3C'],
] as const;

type Filter = 'all' | LoreKind;

/**
 * World books (Character.AI's Lorebook) in the Ink look (owner, 2026-11-13, from the canvas frame):
 * the books as coloured tiles, the picked one's entries under them with a chip per kind it holds, the
 * way Apple's Notes shows folders above their notes. A tap on an entry opens it (your book: the
 * editor; a world's own book: its page, read-only). "+" starts a book (or shows the plan when the
 * shelf is full); "Edit" beside the picked book's name changes its name, lines and friends. With no
 * books yet the screen says what one is and offers the first. A book holds what is true in a world;
 * an entry joins a reply when its name or a keyword comes up in the chat.
 */
export default function LorebooksScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const own = useAppStore((s) => s.lorebooks);
  const characters = useAppStore((s) => s.characters);
  const bookLimit = useAppStore((s) => perkLimit('lorebooks', s.wallet.subscription, Date.now()));
  const entryLimit = useAppStore((s) => perkLimit('loreEntries', s.wallet.subscription, Date.now()));
  const { scrolled, onScroll } = useScrolledPast(44);

  // Yours first (the ones you work on), then any the app ships with (none since Cast 2.0).
  const books = useMemo(() => [...own, ...localized('lorebooks', officialLorebooks)], [own]);
  const [pickedId, setPickedId] = useState<string | undefined>(undefined);
  const picked = books.find((b) => b.id === pickedId) ?? books[0];
  const [filter, setFilter] = useState<Filter>('all');

  const canAdd = own.length < bookLimit;
  const upsell = planWouldAllowMore('lorebooks', own.length, bookLimit);
  const addBook = () => router.push(canAdd ? '/lore/edit' : '/store/shell?tab=plans');

  return (
    <Screen background={systemGround.ground}>
      <GlassBar
        title={t('lore.title')}
        scrolled={scrolled}
        right={
          <View style={styles.barRight}>
            <LoreInfoButton />
            {canAdd || upsell ? <GlassButton icon="add" accessibilityLabel={canAdd ? t('lore.new') : t('lore.morePlan', { count: PERKS.lorebooks.plan })} onPress={addBook} /> : null}
          </View>
        }
      />
      <ScrollView showsVerticalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: insets.bottom + space.huge }}>
        <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
          {t('lore.title')}
        </Text>

        {books.length === 0 ? (
          <View style={styles.empty}>
            <Txt style={styles.emptyText}>{t('lore.howItWorks')}</Txt>
            {canAdd ? (
              <PressableScale style={styles.pill} scaleTo={0.97} accessibilityRole="button" onPress={addBook}>
                <Txt style={styles.pillText} maxFontSizeMultiplier={1.3}>
                  {t('lore.new')}
                </Txt>
              </PressableScale>
            ) : null}
          </View>
        ) : (
          <>
            <View style={styles.tiles}>
              {books.map((book, i) => (
                <BookTile
                  key={book.id}
                  book={book}
                  hue={TILE_HUES[i % TILE_HUES.length]}
                  on={book.id === picked?.id}
                  onPress={() => {
                    setPickedId(book.id);
                    setFilter('all');
                  }}
                />
              ))}
            </View>
            {picked ? (
              <BookEntries
                book={picked}
                serves={picked.official ? t('lore.servesWorldNamed', { world: picked.name }) : servesLine(picked, characters, t)}
                filter={filter}
                onFilter={setFilter}
                entryLimit={entryLimit}
              />
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

/** A book as a tile: its colour, its name in serif, how many entries; the picked one ringed. */
function BookTile({ book, hue, on, onPress }: { book: Lorebook; hue: readonly [string, string]; on: boolean; onPress: () => void }) {
  const { t } = useTranslation();
  const count = t('lore.entryCount', { count: book.entries.length });
  return (
    <PressableScale
      style={[styles.tileWrap, on && styles.tileOn]}
      scaleTo={0.96}
      haptic
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={`${phrase(book.name)}, ${count}`}
      onPress={onPress}>
      <LinearGradient colors={hue} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.tile}>
        <Text style={styles.tileName} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.2}>
          {phrase(book.name)}
        </Text>
        <Text style={styles.tileCount} numberOfLines={1} maxFontSizeMultiplier={1.2}>
          {count}
        </Text>
      </LinearGradient>
    </PressableScale>
  );
}

/** The picked book: who uses it (and Edit for yours), a chip per kind it holds, its entries, then "New entry". */
function BookEntries({
  book,
  serves,
  filter,
  onFilter,
  entryLimit,
}: {
  book: Lorebook;
  serves: string;
  filter: Filter;
  onFilter: (f: Filter) => void;
  entryLimit: number;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const editable = !book.official;
  const kinds = LORE_KINDS.filter((k) => book.entries.some((e) => e.kind === k));
  const shown = filter === 'all' ? book.entries : book.entries.filter((e) => e.kind === filter);
  const count = book.entries.length;
  const canAdd = editable && count < entryLimit;
  const upsell = editable && planWouldAllowMore('loreEntries', count, entryLimit);
  const openEntry = (entry: LoreEntry) =>
    editable ? router.push({ pathname: '/lore/entry', params: { book: book.id, id: entry.id } }) : router.push({ pathname: '/lore/[id]', params: { id: book.id } });

  return (
    <View>
      <View style={styles.bookHead}>
        <Txt style={styles.bookHeadText} lines={1} maxFontSizeMultiplier={1.3}>
          {`${phrase(book.name)} · ${serves}`}
        </Txt>
        {editable ? (
          <PressableScale scaleTo={0.94} accessibilityRole="button" accessibilityLabel={t('lore.edit')} onPress={() => router.push({ pathname: '/lore/edit', params: { id: book.id } })} style={styles.editLink}>
            <Txt style={styles.editText} maxFontSizeMultiplier={1.3}>
              {t('common.edit')}
            </Txt>
          </PressableScale>
        ) : null}
      </View>

      {kinds.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {(['all', ...kinds] as Filter[]).map((k) => {
            const on = k === filter;
            return (
              <PressableScale key={k} scaleTo={0.95} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => onFilter(k)} style={[styles.chip, on && styles.chipOn]}>
                <Txt style={[styles.chipText, on && styles.chipTextOn]} maxFontSizeMultiplier={1.3}>
                  {k === 'all' ? t('us.filter.all') : t(`lore.kinds.${k}`)}
                </Txt>
              </PressableScale>
            );
          })}
        </ScrollView>
      ) : null}

      <View style={styles.list}>
        {shown.map((entry, i) => (
          <EntryLine key={entry.id} entry={entry} last={i === shown.length - 1 && !(canAdd || upsell)} onPress={() => openEntry(entry)} />
        ))}
        {canAdd || upsell ? (
          <AddRow
            label={canAdd ? t('lore.newEntry') : t('lore.moreEntriesPlan', { count: PERKS.loreEntries.plan })}
            count={`${count}/${entryLimit}`}
            locked={!canAdd}
            onPress={canAdd ? () => router.push({ pathname: '/lore/entry', params: { book: book.id } }) : () => router.push('/store/shell?tab=plans')}
          />
        ) : null}
      </View>
      {editable && !count ? <Txt style={styles.foot}>{t('lore.howItWorks')}</Txt> : null}
    </View>
  );
}

/** An entry as a line: its name, then its kind and the other words that call it up (or what is true about it). */
function EntryLine({ entry, last, onPress }: { entry: LoreEntry; last: boolean; onPress: () => void }) {
  const { t } = useTranslation();
  const kind = t(`lore.kind.${entry.kind}`);
  const detail = entry.keywords.length ? t('lore.keywordsLine', { words: entry.keywords.join(', ') }) : entry.text;
  return (
    <PressableScale scaleTo={0.99} dimOnPress accessibilityRole="button" accessibilityLabel={[entry.name, kind, entry.text].join(', ')} onPress={onPress} style={[styles.entry, !last && styles.entryLine]}>
      <View style={styles.entryBody}>
        <Txt style={styles.entryName} lines={1}>
          {entry.name}
        </Txt>
        <Txt style={styles.entryDetail} lines={1}>
          {`${kind} · ${detail}`}
        </Txt>
      </View>
      <Ionicons name="chevron-forward" size={17} color={colors.textFaint} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  barRight: { flexDirection: 'row', gap: space.sm },
  title: { marginTop: 4, marginHorizontal: 20, fontFamily: fonts.serif, fontSize: 36, lineHeight: 42, letterSpacing: -0.5, color: systemGround.label },
  empty: { marginTop: space.lg, marginHorizontal: 20, gap: space.lg },
  emptyText: { fontSize: 17, lineHeight: 24, letterSpacing: -0.3, color: systemGround.secondaryLabel },
  pill: { height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: systemGround.label },
  pillText: { fontSize: 16, fontWeight: '600', color: systemGround.ground },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: space.lg, marginHorizontal: 20 },
  tileWrap: { width: '47.5%', aspectRatio: 1, borderRadius: 34, borderCurve: 'continuous', padding: 3, borderWidth: 2, borderColor: 'transparent' },
  tileOn: { borderColor: systemGround.label },
  tile: { flex: 1, borderRadius: 30, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  tileName: { fontFamily: fonts.serif, fontSize: 24, lineHeight: 29, letterSpacing: -0.3, color: '#111', textAlign: 'center' },
  tileCount: { position: 'absolute', bottom: 14, fontSize: 14, color: 'rgba(0,0,0,0.62)' },
  bookHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xl, marginLeft: 20, marginRight: 10 },
  bookHeadText: { flex: 1, fontSize: 14, fontWeight: '600', color: systemGround.secondaryLabel },
  editLink: { minHeight: 44, paddingHorizontal: 10, justifyContent: 'center' },
  editText: { fontSize: 15, fontWeight: '600', color: colors.brandText },
  chips: { gap: 8, paddingHorizontal: 20, paddingVertical: 4 },
  chip: { height: 38, paddingHorizontal: 16, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: systemGround.fill },
  chipOn: { backgroundColor: systemGround.label },
  chipText: { fontSize: 15, color: systemGround.label },
  chipTextOn: { fontWeight: '600', color: systemGround.ground },
  list: { marginTop: space.md, marginHorizontal: 20 },
  entry: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 64, paddingVertical: 10 },
  entryLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(60,60,67,0.2)' },
  entryBody: { flex: 1, minWidth: 0, gap: 3 },
  entryName: { fontSize: 17, fontWeight: '600', letterSpacing: -0.3, color: systemGround.label },
  entryDetail: { fontSize: 15, lineHeight: 20, color: systemGround.secondaryLabel },
  foot: { marginTop: space.md, marginHorizontal: 20, fontSize: 13, lineHeight: 18, color: systemGround.secondaryLabel },
});
