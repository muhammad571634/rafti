import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, type TextInputInstance, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pill } from '@/components/create/quick-create';
import { GroupLabel } from '@/components/plans/store-look';
import { Avatar, GlassBar, GlassButton, InsetGroup, LargeTitle, PressableScale, Screen, SystemSegmented, Toggle, Txt, useScrolledPast } from '@/components/ui';
import { confirmAction } from '@/lib/confirm';
import { haptic } from '@/lib/haptics';
import { perkLimit } from '@/economy/perks';
import { addTopicLine, PERSONA_ABOUT_MAX, PERSONA_NAME_MAX, PERSONA_TOPICS, PROFILE_PERSONA } from '@/lib/personas';
import { useAppStore } from '@/store/use-app-store';
import { colors, space, systemColors } from '@/theme';
import type { Pronouns } from '@/types';

const PRONOUNS: Pronouns[] = ['she', 'he', 'they'];
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

/**
 * Make or edit a persona (Character.AI's persona editor, in the app's own form look): a photo, a
 * name, pronouns, a few lines the character should know (topic chips start a line), and whether
 * new chats use it. `?id=` edits one; Delete sends the chats that used it back to the default.
 */
export default function PersonaEditScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editId = Array.isArray(id) ? id[0] : id;
  const existing = useAppStore((s) => (editId ? s.personas.find((p) => p.id === editId) : undefined));
  const isDefault = useAppStore((s) => !!editId && s.defaultPersonaId === editId);
  const savePersona = useAppStore((s) => s.savePersona);
  const deletePersona = useAppStore((s) => s.deletePersona);
  const setDefaultPersona = useAppStore((s) => s.setDefaultPersona);
  const limit = useAppStore((s) => perkLimit('personas', s.wallet.subscription, Date.now()));
  const { scrolled, onScroll } = useScrolledPast(44);

  const [avatarUri, setAvatarUri] = useState(existing?.avatarUri);
  const [name, setName] = useState(existing?.name ?? '');
  const [pronouns, setPronouns] = useState<Pronouns | undefined>(existing?.pronouns);
  const [about, setAbout] = useState(existing?.about ?? '');
  const [useByDefault, setUseByDefault] = useState(isDefault);
  const [error, setError] = useState<string | null>(null);
  const aboutRef = useRef<TextInputInstance>(null);

  // A topic chip starts its line and puts the cursor there.
  const addTopic = (label: string) => {
    setAbout((a) => addTopicLine(a, label).slice(0, PERSONA_ABOUT_MAX));
    aboutRef.current?.focus();
  };

  const title = existing ? t('personas.edit') : t('personas.new');

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    if ((asset.fileSize ?? 0) > MAX_PHOTO_BYTES) return setError(t('editProfile.photoTooLarge'));
    setError(null);
    setAvatarUri(asset.uri);
  };

  const save = () => {
    const result = savePersona({ name, pronouns, about, avatarUri }, existing?.id);
    if ('problem' in result) {
      haptic.error();
      return setError(t(`personas.problems.${result.problem}`, { max: limit }));
    }
    if (useByDefault) setDefaultPersona(result.id);
    else if (isDefault) setDefaultPersona(PROFILE_PERSONA);
    haptic.success();
    router.back();
  };

  const remove = () => {
    if (!existing) return;
    confirmAction({
      title: t('personas.deleteConfirm', { name: existing.name }),
      action: t('common.delete'),
      cancel: t('common.cancel'),
      onConfirm: () => {
        deletePersona(existing.id);
        router.back();
      },
    });
  };

  return (
    <Screen background={colors.bg}>
      <GlassBar title={title} scrolled={scrolled} right={<GlassButton label={t('common.save')} accessibilityLabel={t('common.save')} onPress={save} />} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + space.huge }}>
          <LargeTitle>{title}</LargeTitle>

          <View style={styles.hero}>
            <PressableScale onPress={() => void pickPhoto()} scaleTo={0.95} accessibilityRole="button" accessibilityLabel={t('editProfile.photo')}>
              <Avatar source={avatarUri} name={name || '?'} size={104} />
              <View style={styles.camera} pointerEvents="none">
                <Ionicons name="camera" size={16} color={colors.white} />
              </View>
            </PressableScale>
          </View>

          <InsetGroup>
            <View style={[styles.formRow, styles.line]}>
              <Txt style={styles.formLabel}>{t('personas.name')}</Txt>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t('personas.namePlaceholder')}
                placeholderTextColor={colors.textFaint}
                style={styles.formInput}
                maxLength={PERSONA_NAME_MAX}
                accessibilityLabel={t('personas.name')}
              />
            </View>
            <View style={styles.formRow}>
              <Txt style={styles.formLabel}>{t('editProfile.pronouns')}</Txt>
              {/* iOS segmented control; tapping the chosen one again clears it (pronouns are optional). */}
              <SystemSegmented
                options={PRONOUNS.map((p) => ({ value: p, label: t(`personas.pronounShort.${p}`) }))}
                value={pronouns}
                onChange={(p) => {
                  haptic.selection();
                  setPronouns(pronouns === p ? undefined : p);
                }}
                style={styles.flex}
              />
            </View>
          </InsetGroup>

          <GroupLabel>{t('personas.about')}</GroupLabel>
          <InsetGroup>
            <TextInput
              ref={aboutRef}
              value={about}
              onChangeText={setAbout}
              placeholder={t('personas.aboutPlaceholder')}
              placeholderTextColor={colors.textFaint}
              style={styles.about}
              maxLength={PERSONA_ABOUT_MAX}
              multiline
              textAlignVertical="top"
              accessibilityLabel={t('personas.about')}
            />
            <Txt style={styles.count}>{`${about.length}/${PERSONA_ABOUT_MAX}`}</Txt>
            <View style={[styles.topics, styles.topLine]}>
              {PERSONA_TOPICS.map((topic) => (
                <Pill key={topic} label={`+ ${t(`personas.topics.${topic}`)}`} active={false} onPress={() => addTopic(t(`personas.topics.${topic}`))} />
              ))}
            </View>
          </InsetGroup>

          <InsetGroup style={styles.gap}>
            <View style={styles.switchRow}>
              <Txt style={[styles.rowText, styles.flex]}>{t('personas.default')}</Txt>
              <Toggle value={useByDefault} onChange={setUseByDefault} onColor={systemColors.green} accessibilityLabel={t('personas.default')} />
            </View>
          </InsetGroup>

          {error ? <Txt style={styles.error}>{error}</Txt> : null}

          {existing ? (
            <InsetGroup style={styles.gap}>
              <Pressable onPress={remove} accessibilityRole="button" style={({ pressed }) => [styles.switchRow, pressed && styles.pressed]}>
                <Txt style={styles.rowText} color={colors.danger}>
                  {t('personas.delete')}
                </Txt>
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
  hero: { alignItems: 'center', paddingTop: space.md, paddingBottom: space.lg },
  camera: {
    position: 'absolute',
    right: -2,
    bottom: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.bg,
  },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  topLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderStrong },
  pressed: { backgroundColor: colors.surfaceAlt },
  formRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: space.md, marginLeft: space.lg, paddingRight: space.lg },
  formLabel: { width: 84, fontSize: 17, letterSpacing: -0.4, color: colors.text },
  formInput: { flex: 1, minHeight: 48, fontSize: 17, letterSpacing: -0.4, color: colors.text, textAlign: 'right' },
  about: { minHeight: 150, paddingHorizontal: space.lg, paddingTop: 12, fontSize: 17, lineHeight: 22, letterSpacing: -0.4, color: colors.text },
  count: { paddingHorizontal: space.lg, paddingBottom: 10, textAlign: 'right', fontSize: 13, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  topics: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, padding: 14 },
  gap: { marginTop: space.xxl },
  switchRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg },
  rowText: { fontSize: 17, letterSpacing: -0.4, color: colors.text },
  error: { marginTop: space.md, marginHorizontal: space.lg * 2, fontSize: 13, color: systemColors.red },
});
