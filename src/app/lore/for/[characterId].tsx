import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookRow, EntryRow, LoreInfoButton } from '@/components/lore/lore-rows';
import { GroupLabel } from '@/components/plans/store-look';
import { AddRow, GlassBar, Header, InsetGroup, LargeTitle, Screen, Txt, useScrolledPast } from '@/components/ui';
import { perkLimit, PERKS, planWouldAllowMore } from '@/economy/perks';
import { shortName } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { booksFor, recentLines, triggeredLore } from '@/lib/lorebook';
import { phrase } from '@/i18n';
import { officialLorebooks } from '@/mock/lorebooks';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, space } from '@/theme';
import type { Lorebook } from '@/types';

const NO_MESSAGES: never[] = [];

/**
 * A friend's world books, from their chat settings (Character.AI's in-chat lorebook viewer): what
 * the chat has brought up just now, the world they come from, and the user's own books, each with
 * a mark that links it to this friend or takes it off. Their next reply sees the change.
 */
export default function CharacterLoreScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const { characterId } = useLocalSearchParams<{ characterId: string }>();
  const id = Array.isArray(characterId) ? characterId[0] : characterId;
  const character = useAppStore((s) => s.characters.find((c) => c.id === id));
  const relationship = useAppStore((s) => (id ? s.relationships[id] : undefined));
  const conversationId = useAppStore((s) => s.conversations.find((c) => c.characterId === id)?.id);
  const messages = useAppStore((s) => (conversationId ? s.messages[conversationId] : undefined) ?? NO_MESSAGES);
  const own = useAppStore((s) => s.lorebooks);
  const setLoreLink = useAppStore((s) => s.setLoreLink);
  const limit = useAppStore((s) => perkLimit('lorebooks', s.wallet.subscription, Date.now()));
  const { scrolled, onScroll } = useScrolledPast(44);

  // What the next reply would carry: the same pick the server makes from the chat's last lines.
  const now = useMemo(
    () => (character ? triggeredLore(booksFor(character, own, officialLorebooks), recentLines(messages), character.id) : []),
    [character, own, messages],
  );

  if (!character) {
    return (
      <Screen background={colors.bg}>
        <Header title={t('errors.notFound')} />
      </Screen>
    );
  }

  const world = officialLorebooks.find((b) => b.series === character.series);
  const name = shortName(displayName(character, relationship));
  const title = t('lore.chatTitle', { name });
  const canAdd = own.length < limit;
  const upsell = planWouldAllowMore('lorebooks', own.length, limit);
  const open = (book: Lorebook) => router.push({ pathname: '/lore/[id]', params: { id: book.id } });

  return (
    <Screen background={colors.bg}>
      <GlassBar title={title} scrolled={scrolled} right={<LoreInfoButton />} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.huge }}>
        <LargeTitle>{title}</LargeTitle>

        <GroupLabel>{t('lore.inChat')}</GroupLabel>
        <InsetGroup>
          {now.length ? (
            now.map((hit, i) => <EntryRow key={`${hit.book.id}:${hit.entry.id}`} entry={hit.entry} note={t('lore.cameUp', { word: hit.keyword })} last={i === now.length - 1} />)
          ) : (
            <Txt style={styles.empty}>{t('lore.inChatEmpty')}</Txt>
          )}
        </InsetGroup>

        {world ? (
          <>
            <GroupLabel>{t('lore.theirWorld')}</GroupLabel>
            <InsetGroup>
              <BookRow official series={world.series} name={phrase(world.name)} count={world.entries.length} last onPress={() => open(world)} />
            </InsetGroup>
          </>
        ) : null}

        <GroupLabel>{t('lore.yourBooks')}</GroupLabel>
        <InsetGroup>
          {own.map((book, i) => {
            const linked = book.characterIds.includes(character.id);
            return (
              <BookRow
                key={book.id}
                name={book.name}
                hint={linked ? t('lore.usedHere', { name }) : t('lore.notHere', { name })}
                count={book.entries.length}
                last={i === own.length - 1 && !(canAdd || upsell)}
                onPress={() => open(book)}
                right={
                  <Pressable
                    onPress={() => {
                      haptic.selection();
                      setLoreLink(book.id, character.id, !linked);
                    }}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: linked }}
                    accessibilityLabel={t('lore.useWith', { book: book.name, name })}
                    style={styles.mark}>
                    <Ionicons name={linked ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={linked ? colors.primary : colors.textFaint} />
                  </Pressable>
                }
              />
            );
          })}
          {canAdd || upsell ? (
            <AddRow
              label={canAdd ? t('lore.newFor', { name }) : t('lore.morePlan', { count: PERKS.lorebooks.plan })}
              locked={!canAdd}
              onPress={() => router.push(canAdd ? { pathname: '/lore/edit', params: { characterId: character.id } } : '/store/shell?tab=plans')}
            />
          ) : null}
        </InsetGroup>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { paddingHorizontal: space.lg, paddingVertical: 14, fontSize: 15, lineHeight: 20, color: colors.textSecondary },
  mark: { width: 56, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
});
