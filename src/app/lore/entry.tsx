import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pill } from '@/components/create/quick-create';
import { GroupLabel } from '@/components/plans/store-look';
import { GlassBar, GlassButton, InsetGroup, LargeTitle, Screen, Txt, useScrolledPast } from '@/components/ui';
import { perkLimit } from '@/economy/perks';
import { confirmAction } from '@/lib/confirm';
import { haptic } from '@/lib/haptics';
import { LORE_KINDS, LORE_NAME_MAX, LORE_TEXT_MAX } from '@/lib/lorebook';
import { useAppStore } from '@/store/use-app-store';
import { colors, space, systemColors } from '@/theme';
import type { LoreKind } from '@/types';

/**
 * Write or edit one entry of a world book of the user's: what it is (person, place …), its name,
 * other words that call it up, and what is true about it. `?book=` is the book, `?id=` edits.
 */
export default function LoreEntryScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ book: string; id?: string }>();
  const bookId = Array.isArray(params.book) ? params.book[0] : params.book;
  const editId = Array.isArray(params.id) ? params.id[0] : params.id;
  const existing = useAppStore((s) => s.lorebooks.find((b) => b.id === bookId)?.entries.find((e) => e.id === editId));
  const limit = useAppStore((s) => perkLimit('loreEntries', s.wallet.subscription, Date.now()));
  const saveLoreEntry = useAppStore((s) => s.saveLoreEntry);
  const deleteLoreEntry = useAppStore((s) => s.deleteLoreEntry);
  const { scrolled, onScroll } = useScrolledPast(44);

  const [kind, setKind] = useState<LoreKind>(existing?.kind ?? 'place');
  const [name, setName] = useState(existing?.name ?? '');
  const [keywords, setKeywords] = useState(existing?.keywords.join(', ') ?? '');
  const [text, setText] = useState(existing?.text ?? '');
  const [error, setError] = useState<string | null>(null);

  const heading = existing ? t('lore.editEntry') : t('lore.newEntry');

  const save = () => {
    if (!bookId) return;
    const result = saveLoreEntry(bookId, { kind, name, keywords: [keywords], text }, existing?.id);
    if ('problem' in result) {
      haptic.error();
      return setError(t(`lore.entryProblems.${result.problem}`, { max: limit }));
    }
    haptic.success();
    router.back();
  };

  const remove = () => {
    if (!existing || !bookId) return;
    confirmAction({
      title: t('lore.deleteEntryConfirm', { name: existing.name }),
      action: t('common.delete'),
      cancel: t('common.cancel'),
      onConfirm: () => {
        deleteLoreEntry(bookId, existing.id);
        router.back();
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

          <GroupLabel>{t('lore.kindLabel')}</GroupLabel>
          <View style={styles.pills}>
            {LORE_KINDS.map((k) => (
              <Pill
                key={k}
                label={t(`lore.kind.${k}`)}
                active={kind === k}
                onPress={() => {
                  haptic.selection();
                  setKind(k);
                }}
              />
            ))}
          </View>

          <InsetGroup style={styles.first}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t('lore.entryNamePlaceholder')}
              placeholderTextColor={colors.textFaint}
              style={styles.nameInput}
              maxLength={LORE_NAME_MAX}
              accessibilityLabel={t('lore.nameLabel')}
            />
            <View style={styles.line} />
            <TextInput
              value={keywords}
              onChangeText={setKeywords}
              placeholder={t('lore.keywordsPlaceholder')}
              placeholderTextColor={colors.textFaint}
              style={styles.input}
              autoCapitalize="none"
              accessibilityLabel={t('lore.keywordsLabel')}
            />
          </InsetGroup>
          <Txt style={styles.footer}>{t('lore.keywordsHint')}</Txt>

          <GroupLabel>{t('lore.textLabel')}</GroupLabel>
          <InsetGroup>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t('lore.textPlaceholder')}
              placeholderTextColor={colors.textFaint}
              style={styles.area}
              maxLength={LORE_TEXT_MAX}
              multiline
              textAlignVertical="top"
              accessibilityLabel={t('lore.textLabel')}
            />
            <View style={styles.countRow}>
              <Txt style={styles.count}>{`${text.length}/${LORE_TEXT_MAX}`}</Txt>
            </View>
          </InsetGroup>

          {error ? <Txt style={styles.error}>{error}</Txt> : null}

          {existing ? (
            <InsetGroup style={styles.gap}>
              <Pressable onPress={remove} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                <Txt style={[styles.rowText, styles.danger]}>{t('lore.deleteEntry')}</Txt>
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
  first: { marginTop: space.xl },
  gap: { marginTop: space.xxl },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginHorizontal: space.lg },
  nameInput: { minHeight: 50, paddingHorizontal: space.lg, fontSize: 17, fontWeight: '600', letterSpacing: -0.4, color: colors.text },
  input: { minHeight: 50, paddingHorizontal: space.lg, fontSize: 17, letterSpacing: -0.4, color: colors.text },
  line: { marginLeft: space.lg, height: StyleSheet.hairlineWidth, backgroundColor: colors.borderStrong },
  area: { minHeight: 132, paddingHorizontal: space.lg, paddingTop: 12, fontSize: 17, lineHeight: 22, letterSpacing: -0.4, color: colors.text },
  countRow: { paddingHorizontal: space.lg, paddingBottom: 10 },
  count: { textAlign: 'right', fontSize: 13, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  footer: { marginTop: space.sm, marginHorizontal: space.lg * 2, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  row: { minHeight: 50, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg },
  rowText: { fontSize: 17, letterSpacing: -0.4 },
  danger: { color: colors.danger },
  pressed: { backgroundColor: colors.surfaceAlt },
  error: { marginTop: space.md, marginHorizontal: space.lg * 2, fontSize: 13, color: systemColors.red },
});
