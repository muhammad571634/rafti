import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { PaywallSheet } from '@/components/paywall-sheet';
import { Anim, Button, Header, PressableScale, Screen, Txt } from '@/components/ui';
import { shellCosts } from '@/mock';
import { useAppStore } from '@/store/use-app-store';
import { colors, radius, space, type } from '@/theme';
import type { CharacterCategory } from '@/types';

const CATEGORIES: CharacterCategory[] = ['school', 'fantasy', 'idol', 'daily', 'original'];
const MIN_SAMPLES = 3;
const MAX_SAMPLES = 5;
const MAX_SAMPLE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/** The reference "ADD CHARACTER" form is dark; so is this one. */
/** The form's palette, from the theme: fields are white on the warm canvas. */
const form = {
  bg: colors.bgPlain,
  field: colors.surface,
  line: colors.border,
  text: colors.text,
  muted: colors.textSecondary,
  faint: colors.textFaint,
};

interface Sample {
  name: string;
  uri: string;
  size?: number;
}

export default function CreateCharacterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const addCharacter = useAppStore((s) => s.addCharacter);
  const spendShells = useAppStore((s) => s.spendShells);

  const [name, setName] = useState('');
  const [persona, setPersona] = useState('');
  const [greeting, setGreeting] = useState('');
  const [category, setCategory] = useState<CharacterCategory>('original');
  const [samples, setSamples] = useState<Sample[]>([]);
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [isPublic, setIsPublic] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paywall, setPaywall] = useState<number | null>(null);

  const canCreate = name.trim().length > 0 && samples.length >= MIN_SAMPLES && !!imageUri;

  const pickSamples = async () => {
    if (samples.length >= MAX_SAMPLES) return;
    const result = await DocumentPicker.getDocumentAsync({
      type: ['audio/*', 'video/*'],
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;

    const oversized = result.assets.find((a) => (a.size ?? 0) > MAX_SAMPLE_BYTES);
    setError(oversized ? t('createCharacter.tooLarge', { name: oversized.name }) : null);

    const accepted = result.assets
      .filter((a) => (a.size ?? 0) <= MAX_SAMPLE_BYTES)
      .map((a) => ({ name: a.name, uri: a.uri, size: a.size }));
    setSamples((prev) => [...prev, ...accepted].slice(0, MAX_SAMPLES));
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: true,
      aspect: [8, 15],
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    if ((asset.fileSize ?? 0) > MAX_IMAGE_BYTES) return setError(t('createCharacter.imageTooLarge'));
    setError(null);
    setImageUri(asset.uri);
  };

  const create = () => {
    if (!canCreate) return setError(t('createCharacter.needs'));
    if (!spendShells(shellCosts.characterVoiceClone)) return setPaywall(shellCosts.characterVoiceClone);

    setCreating(true);
    // Stands in for the voice-cloning job that runs before the character goes live.
    setTimeout(() => {
      const { conversationId } = addCharacter({
        name: name.trim(),
        handle: '@you',
        bio: persona.trim() || t('createCharacter.personaPlaceholder'),
        category,
        series: 'My Creations',
        avatarUri: imageUri,
        accentIndex: Math.floor(Math.random() * 6),
        voiceReady: true,
        isOfficial: false,
        greeting: greeting.trim() || `Hi, I am ${name.trim()}.`,
        tags: isPublic ? ['custom', 'public'] : ['custom'],
      });
      setCreating(false);
      router.replace(`/chat/${conversationId}`);
    }, 1400);
  };

  return (
    <Screen background={form.bg}>
      <Header title={t('createCharacter.title')} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled">
          <Field label={t('createCharacter.name')} required>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t('createCharacter.namePlaceholder')}
              placeholderTextColor={form.faint}
              style={styles.input}
              maxLength={40}
            />
          </Field>

          <Field label={t('createCharacter.uploadVoices')} required hint={t('createCharacter.uploadVoicesHint')}>
            <PressableScale style={styles.dropzone} onPress={pickSamples} scaleTo={0.98}>
              <Anim name="voiceWave" size={40} tint={form.text} />
              <Txt variant="small" color={form.muted} center style={styles.dropText}>
                {t('createCharacter.uploadVoicesBox')}
              </Txt>
            </PressableScale>

            {samples.length > 0 ? (
              <View style={styles.samples}>
                <Txt variant="smallStrong" color={form.text}>
                  {t('createCharacter.samples', { count: samples.length })}
                </Txt>
                {samples.map((sample, index) => (
                  <View key={`${sample.uri}-${index}`} style={styles.sampleRow}>
                    <Ionicons name="musical-note-outline" size={15} color={form.muted} />
                    <Txt variant="small" color={form.text} lines={1} style={styles.flex}>
                      {sample.name}
                    </Txt>
                    {sample.size ? (
                      <Txt variant="tiny" color={form.faint}>
                        {(sample.size / 1024 / 1024).toFixed(1)}MB
                      </Txt>
                    ) : null}
                    <PressableScale
                      hitSlop={14}
                      scaleTo={0.85}
                      accessibilityLabel={t('a11y.removeClip')}
                      onPress={() => setSamples((prev) => prev.filter((_, i) => i !== index))}>
                      <Ionicons name="trash-outline" size={17} color={form.muted} />
                    </PressableScale>
                  </View>
                ))}
              </View>
            ) : null}
          </Field>

          <Field label={t('createCharacter.uploadImage')} required>
            <PressableScale style={[styles.dropzone, styles.imageZone]} onPress={pickImage} scaleTo={0.98}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.preview} contentFit="cover" />
              ) : (
                <>
                  <Ionicons name="image-outline" size={32} color={form.text} />
                  <Txt variant="small" color={form.muted} center style={styles.dropText}>
                    {t('createCharacter.uploadImageBox')}
                  </Txt>
                </>
              )}
            </PressableScale>
          </Field>

          <Field label={t('createCharacter.persona')}>
            <TextInput
              value={persona}
              onChangeText={setPersona}
              placeholder={t('createCharacter.personaPlaceholder')}
              placeholderTextColor={form.faint}
              style={[styles.input, styles.multiline]}
              multiline
              textAlignVertical="top"
            />
          </Field>

          <Field label={t('createCharacter.greeting')}>
            <TextInput
              value={greeting}
              onChangeText={setGreeting}
              placeholder={t('createCharacter.greetingPlaceholder')}
              placeholderTextColor={form.faint}
              style={[styles.input, styles.multiline]}
              multiline
              textAlignVertical="top"
            />
          </Field>

          <Field label={t('find.category')}>
            <View style={styles.chips}>
              {CATEGORIES.map((key) => (
                <FormChip
                  key={key}
                  label={t(`find.categories.${key}`)}
                  active={category === key}
                  onPress={() => setCategory(key)}
                />
              ))}
            </View>
          </Field>

          <Field label={t('createCharacter.visibility')}>
            <View style={styles.chips}>
              <FormChip label={t('createCharacter.private')} active={!isPublic} onPress={() => setIsPublic(false)} />
              <FormChip label={t('createCharacter.public')} active={isPublic} onPress={() => setIsPublic(true)} />
            </View>
          </Field>

          {error ? (
            <Txt variant="small" color={colors.danger} center>
              {error}
            </Txt>
          ) : null}

          <Button
            label={
              creating
                ? t('createCharacter.creating')
                : t('createCharacter.create', { count: shellCosts.characterVoiceClone })
            }
            onPress={create}
            loading={creating}
            full
            style={!canCreate && styles.dim}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <PaywallSheet need={paywall} onClose={() => setPaywall(null)} />
    </Screen>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Txt variant="bodyStrong" color={form.text}>
          {label}
        </Txt>
        {required ? (
          <Txt variant="bodyStrong" color={colors.danger}>
            *
          </Txt>
        ) : null}
      </View>
      {hint ? (
        <Txt variant="caption" color={form.muted}>
          {hint}
        </Txt>
      ) : null}
      {children}
    </View>
  );
}

function FormChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.94}
      dimOnPress={false}
      style={[styles.chip, active && styles.chipActive]}>
      <Txt variant="smallStrong" color={active ? colors.textOnPrimary : form.muted}>
        {label}
      </Txt>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: space.lg, gap: space.xl, paddingBottom: space.huge },
  field: { gap: space.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  input: {
    minHeight: 48,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: form.line,
    backgroundColor: form.field,
    color: form.text,
    ...type.body,
  },
  multiline: { minHeight: 88 },
  dropzone: {
    minHeight: 132,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: form.line,
    backgroundColor: form.field,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    padding: space.lg,
    overflow: 'hidden',
  },
  imageZone: { minHeight: 170 },
  dropText: { maxWidth: 280 },
  preview: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  samples: { gap: space.sm, marginTop: space.xs },
  sampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: form.line,
    backgroundColor: form.field,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    paddingHorizontal: space.lg,
    height: 34,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: form.line,
    backgroundColor: form.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.text, borderColor: colors.text },
  dim: { opacity: 0.55 },
});
