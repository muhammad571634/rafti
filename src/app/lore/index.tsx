import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InkChip, InkIconButton, InkNavBar, InkText, PillButton, tileTint } from '@/components/ink';
import { KIND_LOOK, LoreInfoButton, servesLine } from '@/components/lore/lore-rows';
import { CharacterAvatar, PressableScale, Screen, Txt, useScrolledPast } from '@/components/ui';
import { perkLimit, PERKS, planWouldAllowMore } from '@/economy/perks';
import { phrase } from '@/i18n';
import { localized } from '@/i18n/content';
import { LORE_KINDS } from '@/lib/lorebook';
import { officialLorebooks } from '@/mock/lorebooks';
import { useAppStore } from '@/store/use-app-store';
import { space } from '@/theme';
import { ink, inkFace, inkGutter, inkRadius } from '@/theme/ink';
import type { Character, LoreEntry, LoreKind, Lorebook } from '@/types';

type Filter = 'all' | LoreKind;

const PEACH_SOFT = ink.tintFill;
const KW_BG = 'rgba(255,255,255,0.06)';
const TILE_RIM = 'rgba(255,255,255,0.10)';
const MAX_KEYWORDS_SHOWN = 4;

/**
 * World books (approved Ink Night+ prototype): sticky Apple HIG nav bar (`Info` + `+`), 2-column
 * stained-glass book tiles displaying overlapping linked-friend avatars and entry counts, 2-line
 * selected book header with peach Edit pill, Android-safe kind filter chips, and an inset Ink card
 * holding entries (colored kind dots, preview text, wrapped keyword chips) + New entry footer.
 */
export default function LorebooksScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const { scrolled, onScroll } = useScrolledPast(34);

  const own = useAppStore((s) => s.lorebooks);
  const characters = useAppStore((s) => s.characters);
  const bookLimit = useAppStore((s) => perkLimit('lorebooks', s.wallet.subscription, Date.now()));
  const entryLimit = useAppStore((s) => perkLimit('loreEntries', s.wallet.subscription, Date.now()));

  // Yours first (the ones you work on), then any the app ships with (none since Cast 2.0).
  const books = useMemo(() => [...own, ...localized('lorebooks', officialLorebooks)], [own]);
  const [pickedId, setPickedId] = useState<string | undefined>(undefined);
  const picked = books.find((b) => b.id === pickedId) ?? books[0];
  const [filter, setFilter] = useState<Filter>('all');

  const canAdd = own.length < bookLimit;
  const upsell = planWouldAllowMore('lorebooks', own.length, bookLimit);
  const addBook = () => router.push(canAdd ? '/lore/edit' : '/store/shell?tab=plans');

  const friendsFor = (book: Lorebook): Character[] =>
    book.characterIds
      .map((id) => characters.find((c) => c.id === id))
      .filter((c): c is Character => !!c)
      .slice(0, 3);

  return (
    <Screen background={ink.ground}>
      <InkNavBar
        backLabel={t('common.back')}
        onBack={() => router.back()}
        title={t('lore.title')}
        scrolled={scrolled}
        right={
          <View style={styles.barRight}>
            <LoreInfoButton />
            {canAdd || upsell ? (
              <InkIconButton
                icon="add"
                size={22}
                accessibilityLabel={canAdd ? t('lore.new') : t('lore.morePlan', { count: PERKS.lorebooks.plan })}
                onPress={addBook}
              />
            ) : null}
          </View>
        }
      />

      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.huge }}>
        <InkText variant="display" accessibilityRole="header" style={styles.screenTitle}>
          {t('lore.title')}
        </InkText>

        {books.length === 0 ? (
          <View style={styles.empty}>
            <InkText variant="body" color={ink.text2}>
              {t('lore.howItWorks')}
            </InkText>
            {canAdd ? <PillButton label={t('lore.new')} onPress={addBook} /> : null}
          </View>
        ) : (
          <>
            <View style={styles.tiles}>
              {books.map((book, i) => (
                <BookTile
                  key={book.id}
                  book={book}
                  tint={tileTint(i)}
                  friends={friendsFor(book)}
                  picked={book.id === picked?.id}
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

/** One stained-glass world book card in the 2-column shelf. */
function BookTile({
  book,
  tint,
  friends,
  picked,
  onPress,
}: {
  book: Lorebook;
  tint: readonly [string, string];
  friends: Character[];
  picked: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const title = phrase(book.name);
  const countText = t('lore.entryCount', { count: book.entries.length });
  return (
    <PressableScale
      scaleTo={0.97}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${countText}`}
      accessibilityState={{ selected: picked }}
      style={[styles.bookTile, picked && styles.bookTilePicked]}>
      <LinearGradient colors={tint} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.tileTop}>
        {friends.length > 0 ? (
          <View style={styles.miniStack}>
            {friends.map((friend, i) => (
              <View
                key={friend.id}
                style={[styles.miniAvatarWrap, { marginLeft: i === 0 ? 0 : -8, borderColor: tint[0], zIndex: 4 - i }]}>
                <CharacterAvatar character={friend} size={22} />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.tileGlyph}>
            <Ionicons name="book-outline" size={14} color="rgba(255,255,255,0.78)" />
          </View>
        )}
        <InkText variant="caption" color="rgba(255,255,255,0.68)" style={styles.tabular}>
          {book.entries.length}
        </InkText>
      </View>

      <View style={styles.tileFoot}>
        <InkText variant="cardSmall" color={ink.text} lines={2} wordSafe>
          {title}
        </InkText>
        <InkText variant="caption" color="rgba(255,255,255,0.58)" lines={1} style={styles.tileCount}>
          {countText}
        </InkText>
      </View>
    </PressableScale>
  );
}

/** The picked book: who uses it + peach Edit pill, kind filter chips, inset Ink card of entries, then "New entry". */
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
    editable
      ? router.push({ pathname: '/lore/entry', params: { book: book.id, id: entry.id } })
      : router.push({ pathname: '/lore/[id]', params: { id: book.id } });
  const openAddEntry = () =>
    canAdd
      ? router.push({ pathname: '/lore/entry', params: { book: book.id } })
      : router.push('/store/shell?tab=plans');

  return (
    <View>
      <View style={styles.bookHead}>
        <View style={styles.flex}>
          <InkText variant="subStrong" color={ink.text} lines={1}>
            {phrase(book.name)}
          </InkText>
          <InkText variant="caption" color={ink.text2} lines={1} style={styles.servesText}>
            {serves}
          </InkText>
        </View>
        {editable ? (
          <PressableScale
            scaleTo={0.94}
            accessibilityRole="button"
            accessibilityLabel={t('lore.edit')}
            onPress={() => router.push({ pathname: '/lore/edit', params: { id: book.id } })}
            style={styles.editPill}>
            <InkText variant="caption" color={ink.accent} lines={1}>
              {t('common.edit')}
            </InkText>
          </PressableScale>
        ) : null}
      </View>

      {kinds.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chips}>
          {(['all', ...kinds] as Filter[]).map((k) => (
            <InkChip key={k} label={k === 'all' ? t('us.filter.all') : t(`lore.kinds.${k}`)} on={k === filter} onPress={() => onFilter(k)} />
          ))}
        </ScrollView>
      ) : null}

      {shown.length > 0 || canAdd || upsell ? (
        <View style={styles.entriesCard}>
          {shown.map((entry, i) => (
            <EntryLine
              key={entry.id}
              entry={entry}
              last={i === shown.length - 1 && !(canAdd || upsell)}
              onPress={() => openEntry(entry)}
            />
          ))}
          {canAdd || upsell ? (
            <Pressable
              onPress={openAddEntry}
              accessibilityRole="button"
              accessibilityLabel={canAdd ? t('lore.newEntry') : t('lore.moreEntriesPlan', { count: PERKS.loreEntries.plan })}
              style={({ pressed }) => [styles.newEntryRow, pressed && styles.rowPressed]}>
              <View style={styles.newEntryLeft}>
                <Ionicons name={canAdd ? 'add' : 'lock-closed'} size={canAdd ? 19 : 15} color={ink.accent} />
                <Txt style={styles.newEntryLabel} lines={2}>
                  {canAdd ? t('lore.newEntry') : t('lore.moreEntriesPlan', { count: PERKS.loreEntries.plan })}
                </Txt>
              </View>
              <Txt style={[styles.newEntryCount, styles.tabular]}>{`${count} / ${entryLimit}`}</Txt>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {editable && !count ? (
        <InkText variant="footnote" color={ink.text2} style={styles.foot}>
          {t('lore.howItWorks')}
        </InkText>
      ) : null}
    </View>
  );
}

/** An entry inside the inset Ink card: colored kind dot, name + kind tag, text preview, and wrapped keyword chips. */
function EntryLine({ entry, last, onPress }: { entry: LoreEntry; last: boolean; onPress: () => void }) {
  const { t } = useTranslation();
  const kindColor = KIND_LOOK[entry.kind].fill;
  const kind = t(`lore.kind.${entry.kind}`);
  const shownWords = entry.keywords.slice(0, MAX_KEYWORDS_SHOWN);
  const extraCount = entry.keywords.length - shownWords.length;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[entry.name, kind, entry.text].join(', ')}
      style={({ pressed }) => [styles.entry, pressed && styles.rowPressed, !last && styles.entryLine]}>
      <View style={[styles.kindDot, { backgroundColor: kindColor }]} />
      <View style={styles.entryBody}>
        <View style={styles.entryTop}>
          <Txt style={styles.entryTitle} lines={1}>
            {entry.name}
          </Txt>
          <Txt style={[styles.entryKind, { color: kindColor }]} lines={1}>
            {kind}
          </Txt>
        </View>
        {entry.text ? (
          <Txt style={styles.entryPreview} lines={1}>
            {entry.text}
          </Txt>
        ) : null}
        {shownWords.length > 0 ? (
          <View style={styles.kwWrap}>
            {shownWords.map((kw, idx) => (
              <View key={`${kw}-${idx}`} style={styles.kwChip}>
                <Txt style={styles.kwText} lines={1}>
                  {kw}
                </Txt>
              </View>
            ))}
            {extraCount > 0 ? (
              <View style={styles.kwChip}>
                <Txt style={[styles.kwText, styles.tabular]}>{`+${extraCount}`}</Txt>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={15} color={ink.text3} style={styles.entryChevron} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  tabular: { fontVariant: ['tabular-nums'] },
  barRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  screenTitle: { marginTop: 2, marginHorizontal: inkGutter },
  empty: { marginTop: 18, marginHorizontal: inkGutter, gap: space.lg },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 11,
    marginTop: 16,
    marginHorizontal: inkGutter,
  },
  bookTile: {
    width: '48.2%',
    minHeight: 132,
    borderRadius: 24,
    borderCurve: 'continuous',
    overflow: 'hidden',
    padding: 14,
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: TILE_RIM,
  },
  bookTilePicked: { borderWidth: 1.8, borderColor: ink.text },
  tileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  miniStack: { flexDirection: 'row', alignItems: 'center' },
  miniAvatarWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tileGlyph: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(9,9,13,0.34)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileFoot: { marginTop: 14 },
  tileCount: { marginTop: 3 },
  bookHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 20,
    marginHorizontal: inkGutter + 4,
  },
  servesText: { marginTop: 1, fontWeight: '400' },
  editPill: {
    height: 30,
    paddingHorizontal: 13,
    borderRadius: inkRadius.pill,
    backgroundColor: PEACH_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsScroll: { marginTop: 12, flexGrow: 0 },
  chips: { gap: 8, paddingHorizontal: inkGutter },
  entriesCard: {
    marginTop: 12,
    marginHorizontal: inkGutter,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    overflow: 'hidden',
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  rowPressed: { backgroundColor: ink.raised },
  entryLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ink.edge },
  kindDot: { width: 9, height: 9, borderRadius: 4.5, marginTop: 6 },
  entryBody: { flex: 1, minWidth: 0, gap: 2 },
  entryTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  entryTitle: { ...inkFace('subStrong'), fontSize: 15.5, color: ink.text, flexShrink: 1 },
  entryKind: { ...inkFace('caption'), fontSize: 11 },
  entryPreview: { ...inkFace('footnote'), color: ink.text2, marginTop: 1 },
  kwWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 7 },
  kwChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: inkRadius.pill,
    backgroundColor: KW_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
  },
  kwText: { ...inkFace('caption'), fontSize: 11, fontWeight: '400', color: ink.text2 },
  entryChevron: { marginTop: 3 },
  newEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  newEntryLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  newEntryLabel: { ...inkFace('subStrong'), fontSize: 15, color: ink.accent, flexShrink: 1 },
  newEntryCount: { ...inkFace('footnote'), color: ink.text2 },
  foot: { marginTop: 14, marginHorizontal: inkGutter + 4 },
});
