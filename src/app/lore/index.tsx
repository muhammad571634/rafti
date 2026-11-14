import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { LoreInfoButton, servesLine } from '@/components/lore/lore-rows';
import { InkChip, InkScreen, InkText, PillButton, Tile, tileTint } from '@/components/ink';
import { AddRow, GlassButton, PressableScale } from '@/components/ui';
import { perkLimit, PERKS, planWouldAllowMore } from '@/economy/perks';
import { phrase } from '@/i18n';
import { localized } from '@/i18n/content';
import { LORE_KINDS } from '@/lib/lorebook';
import { officialLorebooks } from '@/mock/lorebooks';
import { useAppStore } from '@/store/use-app-store';
import { colors, space } from '@/theme';
import { ink, inkGutter } from '@/theme/ink';
import type { LoreEntry, LoreKind, Lorebook } from '@/types';

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
  const { t } = useTranslation();
  const router = useRouter();
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

  return (
    <InkScreen
      title={t('lore.title')}
      right={
        <View style={styles.barRight}>
          <LoreInfoButton />
          {canAdd || upsell ? <GlassButton icon="add" accessibilityLabel={canAdd ? t('lore.new') : t('lore.morePlan', { count: PERKS.lorebooks.plan })} onPress={addBook} /> : null}
        </View>
      }>
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
              <Tile
                key={book.id}
                tint={tileTint(i)}
                name={phrase(book.name)}
                meta={<InkText variant="footnote">{t('lore.entryCount', { count: book.entries.length })}</InkText>}
                accessibilityLabel={`${phrase(book.name)}, ${t('lore.entryCount', { count: book.entries.length })}`}
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
    </InkScreen>
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
        <InkText variant="footnote" lines={1} style={styles.flex}>
          {`${phrase(book.name)} · ${serves}`}
        </InkText>
        {editable ? (
          <PressableScale scaleTo={0.94} accessibilityRole="button" accessibilityLabel={t('lore.edit')} onPress={() => router.push({ pathname: '/lore/edit', params: { id: book.id } })} style={styles.editLink}>
            <InkText variant="subStrong" color={colors.brandText}>
              {t('common.edit')}
            </InkText>
          </PressableScale>
        ) : null}
      </View>

      {kinds.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {(['all', ...kinds] as Filter[]).map((k) => (
            <InkChip key={k} label={k === 'all' ? t('us.filter.all') : t(`lore.kinds.${k}`)} on={k === filter} onPress={() => onFilter(k)} />
          ))}
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
      {editable && !count ? (
        <InkText variant="footnote" style={styles.foot}>
          {t('lore.howItWorks')}
        </InkText>
      ) : null}
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
        <InkText variant="bodyStrong" lines={1}>
          {entry.name}
        </InkText>
        <InkText variant="sub" lines={1}>
          {`${kind} · ${detail}`}
        </InkText>
      </View>
      <Ionicons name="chevron-forward" size={17} color={ink.text3} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  barRight: { flexDirection: 'row', gap: space.sm },
  empty: { marginHorizontal: inkGutter, gap: space.lg },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginHorizontal: inkGutter },
  bookHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xl, marginLeft: inkGutter, marginRight: 10 },
  editLink: { minHeight: 44, paddingHorizontal: 10, justifyContent: 'center' },
  chips: { gap: 8, paddingHorizontal: inkGutter, paddingVertical: 4 },
  list: { marginTop: space.md, marginHorizontal: inkGutter },
  entry: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 64, paddingVertical: 10 },
  entryLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ink.line },
  entryBody: { flex: 1, minWidth: 0, gap: 3 },
  foot: { marginTop: space.md, marginHorizontal: inkGutter },
});
