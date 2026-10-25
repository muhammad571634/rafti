import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FriendRow, useFriends } from '@/components/group/friend-row';
import { GroupLabel } from '@/components/plans/store-look';
import { GlassBar, GlassButton, InsetGroup, LargeTitle, Screen, Txt, useScrolledPast } from '@/components/ui';
import { perkLimit } from '@/economy/perks';
import { confirmAction } from '@/lib/confirm';
import { haptic } from '@/lib/haptics';
import { LORE_ABOUT_MAX, LORE_NAME_MAX } from '@/lib/lorebook';
import { useAppStore } from '@/store/use-app-store';
import { colors, space, systemColors } from '@/theme';

/**
 * Make or edit one of the user's world books: a name, the world in a few lines (always known to
 * the friends it serves), and which friends use it. `?id=` edits one; `?characterId=` starts a
 * new one already linked to that friend (from a chat's world books).
 */
export default function LorebookEditScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; characterId?: string }>();
  const editId = Array.isArray(params.id) ? params.id[0] : params.id;
  const linkTo = Array.isArray(params.characterId) ? params.characterId[0] : params.characterId;
  const existing = useAppStore((s) => (editId ? s.lorebooks.find((b) => b.id === editId) : undefined));
  const limit = useAppStore((s) => perkLimit('lorebooks', s.wallet.subscription, Date.now()));
  const saveLorebook = useAppStore((s) => s.saveLorebook);
  const deleteLorebook = useAppStore((s) => s.deleteLorebook);
  const friends = useFriends();
  const { scrolled, onScroll } = useScrolledPast(44);

  const [name, setName] = useState(existing?.name ?? '');
  const [about, setAbout] = useState(existing?.about ?? '');
  const [linked, setLinked] = useState<string[]>(existing?.characterIds ?? (linkTo ? [linkTo] : []));
  const [error, setError] = useState<string | null>(null);

  const heading = existing ? t('lore.edit') : t('lore.new');

  const toggle = (characterId: string) => {
    haptic.selection();
    setLinked((ids) => (ids.includes(characterId) ? ids.filter((x) => x !== characterId) : [...ids, characterId]));
  };

  const save = () => {
    const result = saveLorebook({ name, about, characterIds: linked }, existing?.id);
    if ('problem' in result) {
      haptic.error();
      return setError(t(`lore.problems.${result.problem}`, { max: limit }));
    }
    haptic.success();
    // A new book opens on its page, ready for its first entry.
    if (existing) router.back();
    else router.replace({ pathname: '/lore/[id]', params: { id: result.id } });
  };

  const remove = () => {
    if (!existing) return;
    confirmAction({
      title: t('lore.deleteConfirm', { name: existing.name }),
      action: t('common.delete'),
      cancel: t('common.cancel'),
      onConfirm: () => {
        deleteLorebook(existing.id);
        // The editor opens over the book's page, which goes too.
        router.dismiss(2);
      },
    });
  };

  return (
    <Screen background={colors.bg}>
      <GlassBar title={heading} scrolled={scrolled} right={<GlassButton label={t('common.save')} accessibilityLabel={t('common.save')} onPress={save} />} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + space.huge }}>
          <LargeTitle>{heading}</LargeTitle>

          <InsetGroup style={styles.first}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t('lore.namePlaceholder')}
              placeholderTextColor={colors.textFaint}
              style={styles.nameInput}
              maxLength={LORE_NAME_MAX}
              accessibilityLabel={t('lore.nameLabel')}
            />
          </InsetGroup>

          <GroupLabel>{t('lore.alwaysKnown')}</GroupLabel>
          <InsetGroup>
            <TextInput
              value={about}
              onChangeText={setAbout}
              placeholder={t('lore.aboutPlaceholder')}
              placeholderTextColor={colors.textFaint}
              style={styles.area}
              maxLength={LORE_ABOUT_MAX}
              multiline
              textAlignVertical="top"
              accessibilityLabel={t('lore.alwaysKnown')}
            />
            <View style={styles.countRow}>
              <Txt style={styles.count}>{`${about.length}/${LORE_ABOUT_MAX}`}</Txt>
            </View>
          </InsetGroup>
          <Txt style={styles.footer}>{t('lore.aboutHint')}</Txt>

          <GroupLabel>{t('lore.whoKnows')}</GroupLabel>
          {friends.length ? (
            <InsetGroup>
              {friends.map((friend, i) => (
                <FriendRow
                  key={friend.character.id}
                  friend={friend}
                  picked={linked.includes(friend.character.id)}
                  last={i === friends.length - 1}
                  onPress={() => toggle(friend.character.id)}
                  accessibilityLabel={friend.name}
                />
              ))}
            </InsetGroup>
          ) : (
            <Txt style={styles.footer}>{t('lore.noFriends')}</Txt>
          )}
          {friends.length ? <Txt style={styles.footer}>{t('lore.whoKnowsHint')}</Txt> : null}

          {error ? <Txt style={styles.error}>{error}</Txt> : null}

          {existing ? (
            <InsetGroup style={styles.gap}>
              <Pressable onPress={remove} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                <Txt style={[styles.rowText, styles.danger]}>{t('lore.delete')}</Txt>
              </Pressable>
            </InsetGroup>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  first: { marginTop: 14 },
  gap: { marginTop: space.xxl },
  nameInput: { minHeight: 50, paddingHorizontal: space.lg, fontSize: 17, fontWeight: '600', letterSpacing: -0.4, color: colors.text },
  area: { minHeight: 96, paddingHorizontal: space.lg, paddingTop: 12, fontSize: 17, lineHeight: 22, letterSpacing: -0.4, color: colors.text },
  countRow: { paddingHorizontal: space.lg, paddingBottom: 10 },
  count: { textAlign: 'right', fontSize: 13, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  footer: { marginTop: space.sm, marginHorizontal: space.lg * 2, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  row: { minHeight: 50, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg },
  rowText: { fontSize: 17, letterSpacing: -0.4 },
  danger: { color: colors.danger },
  pressed: { backgroundColor: colors.surfaceAlt },
  error: { marginTop: space.md, marginHorizontal: space.lg * 2, fontSize: 13, color: systemColors.red },
});
