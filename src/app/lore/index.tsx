import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookRow, LoreInfoButton, servesLine } from '@/components/lore/lore-rows';
import { GroupLabel } from '@/components/plans/store-look';
import { AddRow, GlassBar, InsetGroup, LargeTitle, Screen, useScrolledPast } from '@/components/ui';
import { perkLimit, PERKS, planWouldAllowMore } from '@/economy/perks';
import { phrase } from '@/i18n';
import { officialLorebooks } from '@/mock/lorebooks';
import { useAppStore } from '@/store/use-app-store';
import { colors, space } from '@/theme';
import type { Lorebook } from '@/types';

/**
 * World books (Character.AI's Lorebook): the worlds' own books, free and read-only, then the
 * user's (a plan perk: `PERKS.lorebooks`). A book holds what is true in a world; an entry joins a
 * reply when its name or a keyword comes up in the chat.
 */
export default function LorebooksScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const own = useAppStore((s) => s.lorebooks);
  const characters = useAppStore((s) => s.characters);
  const limit = useAppStore((s) => perkLimit('lorebooks', s.wallet.subscription, Date.now()));
  const { scrolled, onScroll } = useScrolledPast(44);

  const canAdd = own.length < limit;
  const upsell = planWouldAllowMore('lorebooks', own.length, limit);
  const open = (book: Lorebook) => router.push({ pathname: '/lore/[id]', params: { id: book.id } });

  return (
    <Screen background={colors.bg}>
      <GlassBar title={t('lore.title')} scrolled={scrolled} right={<LoreInfoButton />} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.huge }}>
        <LargeTitle>{t('lore.title')}</LargeTitle>

        <GroupLabel>{t('lore.worlds')}</GroupLabel>
        <InsetGroup>
          {officialLorebooks.map((book, i) => (
            <BookRow
              key={book.id}
              official
              series={book.series}
              name={phrase(book.name)}
              count={book.entries.length}
              last={i === officialLorebooks.length - 1}
              onPress={() => open(book)}
            />
          ))}
        </InsetGroup>

        <GroupLabel>{t('lore.yours')}</GroupLabel>
        <InsetGroup>
          {own.map((book, i) => (
            <BookRow
              key={book.id}
              name={phrase(book.name)}
              hint={servesLine(book, characters, t)}
              count={book.entries.length}
              last={i === own.length - 1 && !(canAdd || upsell)}
              onPress={() => open(book)}
            />
          ))}
          {canAdd || upsell ? (
            <AddRow
              label={canAdd ? t('lore.new') : t('lore.morePlan', { count: PERKS.lorebooks.plan })}
              count={`${own.length}/${limit}`}
              locked={!canAdd}
              onPress={() => router.push(canAdd ? '/lore/edit' : '/store/shell?tab=plans')}
            />
          ) : null}
        </InsetGroup>
      </ScrollView>
    </Screen>
  );
}
