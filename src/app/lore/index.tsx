import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookRow, servesLine } from '@/components/lore/lore-rows';
import { GroupLabel } from '@/components/plans/store-look';
import { GlassBar, GlassButton, InsetGroup, LargeTitle, Screen, Txt, useScrolledPast } from '@/components/ui';
import { perkLimit, PERKS, planWouldAllowMore } from '@/economy/perks';
import { officialLorebooks } from '@/mock/lorebooks';
import { useAppStore } from '@/store/use-app-store';
import { colors, space, systemColors } from '@/theme';
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
      <GlassBar
        title={t('lore.title')}
        scrolled={scrolled}
        right={canAdd ? <GlassButton icon="add" accessibilityLabel={t('lore.new')} onPress={() => router.push('/lore/edit')} /> : undefined}
      />
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
              name={book.name}
              hint={t('lore.servesWorld')}
              count={book.entries.length}
              last={i === officialLorebooks.length - 1}
              onPress={() => open(book)}
            />
          ))}
        </InsetGroup>

        <GroupLabel>{t('lore.yours', { count: own.length, max: limit })}</GroupLabel>
        <InsetGroup>
          {own.map((book, i) => (
            <BookRow
              key={book.id}
              name={book.name}
              hint={servesLine(book, characters, t)}
              count={book.entries.length}
              last={i === own.length - 1 && !(canAdd || upsell)}
              onPress={() => open(book)}
            />
          ))}
          {canAdd || upsell ? (
            <Pressable
              onPress={() => router.push(canAdd ? '/lore/edit' : '/store/shell?tab=plans')}
              accessibilityRole="button"
              style={({ pressed }) => [styles.add, pressed && styles.pressed]}>
              <Ionicons name={canAdd ? 'add-circle' : 'lock-closed'} size={22} color={canAdd ? systemColors.green : colors.textSecondary} />
              <Txt style={styles.addText}>{canAdd ? t('lore.new') : t('lore.morePlan', { count: PERKS.lorebooks.plan })}</Txt>
            </Pressable>
          ) : null}
        </InsetGroup>
        <Txt style={styles.footer}>{t('lore.howItWorks')}</Txt>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  add: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg },
  addText: { flex: 1, fontSize: 17, letterSpacing: -0.4, color: colors.text },
  pressed: { backgroundColor: colors.surfaceAlt },
  footer: { marginTop: space.sm, marginHorizontal: space.lg * 2, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
});
