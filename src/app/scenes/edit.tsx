import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GroupLabel } from '@/components/plans/store-look';
import { GlassBar, GlassButton, InsetGroup, LargeTitle, Screen, Txt, useScrolledPast } from '@/components/ui';
import { perkLimit } from '@/economy/perks';
import { confirmAction } from '@/lib/confirm';
import { haptic } from '@/lib/haptics';
import { SCENE_OPENING_MAX, SCENE_ROLE_MAX, SCENE_SETTING_MAX, SCENE_TITLE_MAX } from '@/lib/scenes';
import { useAppStore } from '@/store/use-app-store';
import { colors, space, systemColors } from '@/theme';

/**
 * Write or edit one of your own scenes: a title, where you are and what is happening, who you are
 * in it, and (if you like) their first line; without one, they open it themselves. `?id=` edits.
 */
export default function SceneEditScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editId = Array.isArray(id) ? id[0] : id;
  const existing = useAppStore((s) => (editId ? s.scenes.find((x) => x.id === editId) : undefined));
  const limit = useAppStore((s) => perkLimit('ownScenes', s.wallet.subscription, Date.now()));
  const saveScene = useAppStore((s) => s.saveScene);
  const deleteScene = useAppStore((s) => s.deleteScene);
  const { scrolled, onScroll } = useScrolledPast(44);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [setting, setSetting] = useState(existing?.setting ?? '');
  const [userRole, setUserRole] = useState(existing?.userRole ?? '');
  const [opening, setOpening] = useState(existing?.opening ?? '');
  const [error, setError] = useState<string | null>(null);

  const heading = existing ? t('scenes.edit') : t('scenes.new');

  const save = () => {
    const result = saveScene({ title, setting, userRole, opening }, existing?.id);
    if ('problem' in result) {
      haptic.error();
      return setError(t(`scenes.problems.${result.problem}`, { max: limit }));
    }
    haptic.success();
    router.back();
  };

  const remove = () => {
    if (!existing) return;
    confirmAction({
      title: t('scenes.deleteConfirm', { title: existing.title }),
      action: t('common.delete'),
      cancel: t('common.cancel'),
      onConfirm: () => {
        deleteScene(existing.id);
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

          <InsetGroup style={styles.first}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t('scenes.titlePlaceholder')}
              placeholderTextColor={colors.textFaint}
              style={styles.titleInput}
              maxLength={SCENE_TITLE_MAX}
              accessibilityLabel={t('scenes.titleLabel')}
            />
          </InsetGroup>

          <Field label={t('scenes.setting')} value={setting} onChange={setSetting} placeholder={t('scenes.settingPlaceholder')} max={SCENE_SETTING_MAX} tall />
          <Field label={t('scenes.role')} value={userRole} onChange={setUserRole} placeholder={t('scenes.rolePlaceholder')} max={SCENE_ROLE_MAX} />
          <Field label={t('scenes.opening')} value={opening} onChange={setOpening} placeholder={t('scenes.openingPlaceholder')} max={SCENE_OPENING_MAX} />

          {error ? <Txt style={styles.error}>{error}</Txt> : null}

          {existing ? (
            <InsetGroup style={styles.gap}>
              <Pressable onPress={remove} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                <Txt style={styles.rowText} color={colors.danger}>
                  {t('scenes.delete')}
                </Txt>
              </Pressable>
            </InsetGroup>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  max,
  tall,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  max: number;
  tall?: boolean;
}) {
  return (
    <>
      <GroupLabel>{label}</GroupLabel>
      <InsetGroup>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textFaint}
          style={[styles.area, tall && styles.tall]}
          maxLength={max}
          multiline
          textAlignVertical="top"
          accessibilityLabel={label}
        />
        <View style={styles.countRow}>
          <Txt style={styles.count}>{`${value.length}/${max}`}</Txt>
        </View>
      </InsetGroup>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  first: { marginTop: 14 },
  gap: { marginTop: space.xxl },
  titleInput: { minHeight: 50, paddingHorizontal: space.lg, fontSize: 17, fontWeight: '600', letterSpacing: -0.4, color: colors.text },
  area: { minHeight: 72, paddingHorizontal: space.lg, paddingTop: 12, fontSize: 17, lineHeight: 22, letterSpacing: -0.4, color: colors.text },
  tall: { minHeight: 132 },
  countRow: { paddingHorizontal: space.lg, paddingBottom: 10 },
  count: { textAlign: 'right', fontSize: 13, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  row: { minHeight: 50, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg },
  rowText: { fontSize: 17, letterSpacing: -0.4, color: colors.text },
  pressed: { backgroundColor: colors.surfaceAlt },
  error: { marginTop: space.md, marginHorizontal: space.lg * 2, fontSize: 13, color: systemColors.red },
});
