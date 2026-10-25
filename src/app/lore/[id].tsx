import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EntryRow, servesLine } from '@/components/lore/lore-rows';
import { GroupLabel } from '@/components/plans/store-look';
import { AddRow, GlassBar, GlassButton, Header, InsetGroup, LargeTitle, Screen, Txt, useScrolledPast } from '@/components/ui';
import { perkLimit, PERKS, planWouldAllowMore } from '@/economy/perks';
import { LORE_KINDS } from '@/lib/lorebook';
import { officialLorebooks } from '@/mock/lorebooks';
import { useAppStore } from '@/store/use-app-store';
import { colors, space } from '@/theme';

/**
 * One world book: the world in a few lines (always known), who it serves, and its entries by
 * kind. A world's own book is read-only; the user's opens each entry in the editor and adds new
 * ones up to the plan's number (`PERKS.loreEntries`).
 */
export default function LorebookScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookId = Array.isArray(id) ? id[0] : id;
  const own = useAppStore((s) => s.lorebooks.find((b) => b.id === bookId));
  const characters = useAppStore((s) => s.characters);
  const limit = useAppStore((s) => perkLimit('loreEntries', s.wallet.subscription, Date.now()));
  const { scrolled, onScroll } = useScrolledPast(44);

  const book = own ?? officialLorebooks.find((b) => b.id === bookId);
  if (!book) {
    return (
      <Screen background={colors.bg}>
        <Header title={t('errors.notFound')} />
      </Screen>
    );
  }

  const editable = !!own;
  const count = book.entries.length;
  const canAdd = editable && count < limit;
  const upsell = editable && planWouldAllowMore('loreEntries', count, limit);
  const addEntry = () => router.push({ pathname: '/lore/entry', params: { book: book.id } });
  const kinds = LORE_KINDS.map((kind) => ({ kind, entries: book.entries.filter((e) => e.kind === kind) })).filter((g) => g.entries.length);

  return (
    <Screen background={colors.bg}>
      <GlassBar
        title={book.name}
        scrolled={scrolled}
        right={
          editable ? (
            <GlassButton label={t('common.edit')} accessibilityLabel={t('lore.edit')} onPress={() => router.push({ pathname: '/lore/edit', params: { id: book.id } })} />
          ) : undefined
        }
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.huge }}>
        <LargeTitle>{book.name}</LargeTitle>

        {book.about ? (
          <>
            <GroupLabel>{t('lore.alwaysKnown')}</GroupLabel>
            <InsetGroup>
              <Txt style={styles.about}>{book.about}</Txt>
            </InsetGroup>
          </>
        ) : null}
        <Txt style={styles.footer}>{book.official ? t('lore.servesWorldNamed', { world: book.name }) : servesLine(book, characters, t)}</Txt>

        {kinds.map(({ kind, entries }) => (
          <View key={kind}>
            <GroupLabel>{t(`lore.kinds.${kind}`)}</GroupLabel>
            <InsetGroup>
              {entries.map((entry, i) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  last={i === entries.length - 1}
                  onPress={editable ? () => router.push({ pathname: '/lore/entry', params: { book: book.id, id: entry.id } }) : undefined}
                />
              ))}
            </InsetGroup>
          </View>
        ))}

        {editable ? (
          <InsetGroup style={styles.gap}>
            {canAdd || upsell ? (
              <AddRow
                label={canAdd ? t('lore.newEntry') : t('lore.moreEntriesPlan', { count: PERKS.loreEntries.plan })}
                count={`${count}/${limit}`}
                locked={!canAdd}
                onPress={canAdd ? addEntry : () => router.push('/store/shell?tab=plans')}
              />
            ) : (
              <View style={styles.add}>
                <Txt style={[styles.addText, styles.muted]}>{t('lore.full', { max: limit })}</Txt>
              </View>
            )}
          </InsetGroup>
        ) : (
          <Txt style={[styles.footer, styles.gap]}>{t('lore.readOnly')}</Txt>
        )}
        {editable && !count ? <Txt style={styles.footer}>{t('lore.howItWorks')}</Txt> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { marginTop: space.xxl },
  about: { paddingHorizontal: space.lg, paddingVertical: 12, fontSize: 17, lineHeight: 23, letterSpacing: -0.4, color: colors.text },
  footer: { marginTop: space.sm, marginHorizontal: space.lg * 2, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  add: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg },
  addText: { flex: 1, fontSize: 17, letterSpacing: -0.4, color: colors.text },
  muted: { color: colors.textSecondary },
});
