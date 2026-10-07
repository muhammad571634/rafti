import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { PaywallSheet } from '@/components/paywall-sheet';
import { Anim, Button, ClayIcon, Header, PressableScale, Screen, Txt } from '@/components/ui';
import {
  BIO_MAX,
  checkCreation,
  GENDERS,
  GREETING_MAX,
  MAX_SAMPLES,
  MAX_TRAITS,
  NAME_MAX,
  ROLES,
  STYLES,
  TRAITS,
  VOICES,
  type VoiceChoice,
} from '@/lib/create-character';
import { shellCosts } from '@/mock';
import { useAppStore } from '@/store/use-app-store';
import { colors, radius, space, type } from '@/theme';
import type { CharacterCategory, CharacterGender, CharacterRole, SpeakingStyle, VoicePreset } from '@/types';

const CATEGORIES: CharacterCategory[] = ['school', 'fantasy', 'idol', 'daily', 'original'];
const MAX_SAMPLE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
/** How long the mock voice clone "trains"; the server job replaces it. */
const CLONE_MS = 1400;

interface Sample {
  name: string;
  uri: string;
  size?: number;
}

/**
 * F15: make your own character. Structure from BIMOBIMO (photo, voice clips, persona,
 * greeting, visibility) plus what character apps share as a standard: traits, a
 * speaking style, what they are to you, and a stock voice when there are no clips.
 * Every creation is an adult; the photo and a cloned voice need the creator's word
 * that they have the right to use them. Public ones wait for review.
 */
export default function CreateCharacterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const addCharacter = useAppStore((s) => s.addCharacter);
  const spendShells = useAppStore((s) => s.spendShells);

  const [imageUri, setImageUri] = useState<string | undefined>();
  const [photoRights, setPhotoRights] = useState(false);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<CharacterGender | undefined>();
  const [age, setAge] = useState('');
  const [category, setCategory] = useState<CharacterCategory>('original');
  const [traits, setTraits] = useState<string[]>([]);
  const [style, setStyle] = useState<SpeakingStyle>('casual');
  const [role, setRole] = useState<CharacterRole>('friend');
  const [bio, setBio] = useState('');
  const [greeting, setGreeting] = useState('');
  const [voiceMode, setVoiceMode] = useState<'preset' | 'clone'>('preset');
  const [preset, setPreset] = useState<VoicePreset | undefined>();
  const [samples, setSamples] = useState<Sample[]>([]);
  const [voiceConsent, setVoiceConsent] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paywall, setPaywall] = useState<number | null>(null);

  const voice: VoiceChoice | null =
    voiceMode === 'clone' ? { kind: 'clone', samples: samples.length } : preset ? { kind: 'preset', preset } : null;
  const cost = voiceMode === 'clone' ? shellCosts.characterVoiceClone : 0;
  const problems = checkCreation({
    name,
    age,
    bio,
    greeting,
    hasPhoto: !!imageUri,
    photoRights,
    voice,
    voiceConsent,
  });

  const toggleTrait = (trait: string) =>
    setTraits((prev) =>
      prev.includes(trait) ? prev.filter((x) => x !== trait) : prev.length < MAX_TRAITS ? [...prev, trait] : prev,
    );

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
      aspect: [1, 1],
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    if ((asset.fileSize ?? 0) > MAX_IMAGE_BYTES) return setError(t('createCharacter.imageTooLarge'));
    setError(null);
    setImageUri(asset.uri);
  };

  const create = () => {
    if (problems.length > 0) return setError(t(`createCharacter.problems.${problems[0]}`));
    if (cost > 0 && !spendShells(cost, 'voiceClone')) return setPaywall(cost);

    setCreating(true);
    const finish = () => {
      const clean = name.trim();
      const { conversationId } = addCharacter({
        name: clean,
        handle: '@you',
        bio: bio.trim() || t('createCharacter.defaultBio', { traits: traits.join(', ') || t('createCharacter.styles.casual') }),
        category,
        gender,
        series: 'My Creations',
        avatarUri: imageUri,
        accentIndex: Math.floor(Math.random() * 6),
        voiceReady: true,
        isOfficial: false,
        greeting: greeting.trim() || t('createCharacter.defaultGreeting', { name: clean }),
        tags: traits,
        age: Number(age),
        speakingStyle: style,
        role,
        voicePreset: voiceMode === 'preset' ? preset : undefined,
        visibility: isPublic ? 'public' : 'private',
        review: isPublic ? 'pending' : undefined,
      });
      setCreating(false);
      router.replace(`/chat/${conversationId}`);
    };
    // A cloned voice trains first (a server job later); a stock voice is ready now.
    if (voiceMode === 'clone') setTimeout(finish, CLONE_MS);
    else finish();
  };

  return (
    <Screen background={colors.bgPlain}>
      <Header title={t('createCharacter.title')} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled">
          <View style={styles.photoBlock}>
            <PressableScale
              style={styles.photo}
              onPress={pickImage}
              scaleTo={0.97}
              accessibilityLabel={t('createCharacter.uploadImage')}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.fillImage} contentFit="cover" />
              ) : (
                <ClayIcon name="photo" size={56} tile={false} />
              )}
            </PressableScale>
            <CheckRow
              checked={photoRights}
              onToggle={() => setPhotoRights((v) => !v)}
              label={t('createCharacter.photoRights')}
            />
          </View>

          <Field label={t('createCharacter.name')} required>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t('createCharacter.namePlaceholder')}
              placeholderTextColor={colors.textFaint}
              style={styles.input}
              maxLength={NAME_MAX}
            />
          </Field>

          <View style={styles.pair}>
            <Field label={t('createCharacter.age')} required style={styles.ageField}>
              <TextInput
                value={age}
                onChangeText={(v) => setAge(v.replace(/[^0-9]/g, ''))}
                placeholder="18+"
                placeholderTextColor={colors.textFaint}
                keyboardType="number-pad"
                style={styles.input}
                maxLength={3}
              />
            </Field>
            <Field label={t('createCharacter.gender')} style={styles.flex}>
              <View style={styles.chips}>
                {GENDERS.map((g) => (
                  <FormChip
                    key={g}
                    label={t(`find.who.${g}`)}
                    active={gender === g}
                    onPress={() => setGender(gender === g ? undefined : g)}
                  />
                ))}
              </View>
            </Field>
          </View>

          <Field label={t('createCharacter.traits', { count: traits.length, max: MAX_TRAITS })}>
            <View style={styles.chips}>
              {TRAITS.map((trait) => (
                <FormChip
                  key={trait}
                  label={t(`createCharacter.traitNames.${trait}`)}
                  active={traits.includes(trait)}
                  onPress={() => toggleTrait(trait)}
                />
              ))}
            </View>
          </Field>

          <Field label={t('createCharacter.style')}>
            <View style={styles.chips}>
              {STYLES.map((s) => (
                <FormChip
                  key={s}
                  label={t(`createCharacter.styles.${s}`)}
                  active={style === s}
                  onPress={() => setStyle(s)}
                />
              ))}
            </View>
          </Field>

          <Field label={t('createCharacter.role')}>
            <View style={styles.chips}>
              {ROLES.map((r) => (
                <FormChip key={r} label={t(`createCharacter.roles.${r}`)} active={role === r} onPress={() => setRole(r)} />
              ))}
            </View>
          </Field>

          <Field label={t('createCharacter.persona')}>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder={t('createCharacter.personaPlaceholder')}
              placeholderTextColor={colors.textFaint}
              style={[styles.input, styles.multiline]}
              maxLength={BIO_MAX}
              multiline
              textAlignVertical="top"
            />
          </Field>

          <Field label={t('createCharacter.greeting')}>
            <TextInput
              value={greeting}
              onChangeText={setGreeting}
              placeholder={t('createCharacter.greetingPlaceholder')}
              placeholderTextColor={colors.textFaint}
              style={[styles.input, styles.multiline]}
              maxLength={GREETING_MAX}
              multiline
              textAlignVertical="top"
            />
          </Field>

          <Field label={t('createCharacter.voice')} required>
            <View style={styles.chips}>
              <FormChip
                label={t('createCharacter.voicePreset')}
                active={voiceMode === 'preset'}
                onPress={() => setVoiceMode('preset')}
              />
              <FormChip
                label={t('createCharacter.voiceClone', { count: shellCosts.characterVoiceClone })}
                active={voiceMode === 'clone'}
                onPress={() => setVoiceMode('clone')}
              />
            </View>

            {voiceMode === 'preset' ? (
              <View style={styles.voices}>
                {VOICES.map((v) => (
                  <PressableScale
                    key={v}
                    scaleTo={0.95}
                    onPress={() => setPreset(v)}
                    accessibilityState={{ selected: preset === v }}
                    style={[styles.voiceCell, preset === v && styles.voiceCellOn]}>
                    <Anim name="voiceWave" size={26} tint={preset === v ? colors.primary : colors.textMuted} />
                    <Txt variant="smallStrong" color={preset === v ? colors.text : colors.textSecondary}>
                      {t(`createCharacter.voices.${v}`)}
                    </Txt>
                  </PressableScale>
                ))}
              </View>
            ) : (
              <>
                <PressableScale style={styles.dropzone} onPress={pickSamples} scaleTo={0.98}>
                  <ClayIcon name="voice" size={44} tile={false} />
                  <Txt variant="small" color={colors.textSecondary} center style={styles.dropText}>
                    {t('createCharacter.uploadVoicesBox')}
                  </Txt>
                </PressableScale>
                {samples.length > 0 ? (
                  <View style={styles.samples}>
                    <Txt variant="smallStrong">{t('createCharacter.samples', { count: samples.length })}</Txt>
                    {samples.map((sample, index) => (
                      <View key={`${sample.uri}-${index}`} style={styles.sampleRow}>
                        <Ionicons name="musical-note-outline" size={15} color={colors.textSecondary} />
                        <Txt variant="small" lines={1} style={styles.flex}>
                          {sample.name}
                        </Txt>
                        <PressableScale
                          hitSlop={14}
                          scaleTo={0.85}
                          accessibilityLabel={t('a11y.removeClip')}
                          onPress={() => setSamples((prev) => prev.filter((_, i) => i !== index))}>
                          <Ionicons name="trash-outline" size={17} color={colors.textSecondary} />
                        </PressableScale>
                      </View>
                    ))}
                  </View>
                ) : null}
                <CheckRow
                  checked={voiceConsent}
                  onToggle={() => setVoiceConsent((v) => !v)}
                  label={t('createCharacter.voiceConsent')}
                />
              </>
            )}
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
            {isPublic ? (
              <Txt variant="caption" color={colors.textMuted}>
                {t('createCharacter.reviewNote')}
              </Txt>
            ) : null}
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
                : cost > 0
                  ? t('createCharacter.create', { count: cost })
                  : t('createCharacter.createFree')
            }
            size="lg"
            onPress={create}
            loading={creating}
            full
            style={problems.length > 0 && styles.dim}
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
  style,
  children,
}: {
  label: string;
  required?: boolean;
  style?: object;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.field, style]}>
      <View style={styles.labelRow}>
        <Txt variant="bodyStrong">{label}</Txt>
        {required ? (
          <Txt variant="bodyStrong" color={colors.danger}>
            *
          </Txt>
        ) : null}
      </View>
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
      accessibilityState={{ selected: active }}
      style={[styles.chip, active && styles.chipActive]}>
      <Txt variant="smallStrong" color={active ? colors.textOnPrimary : colors.textSecondary}>
        {label}
      </Txt>
    </PressableScale>
  );
}

/** The creator's word on rights and consent: a checkbox with one short line. */
function CheckRow({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  return (
    <PressableScale
      onPress={onToggle}
      scaleTo={0.98}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={styles.checkRow}>
      <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={22} color={checked ? colors.primary : colors.textMuted} />
      <Txt variant="small" color={colors.textSecondary} style={styles.flex}>
        {label}
      </Txt>
    </PressableScale>
  );
}

const PHOTO = 132;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: space.lg, gap: space.xl, paddingBottom: space.huge },
  field: { gap: space.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  pair: { flexDirection: 'row', gap: space.lg },
  ageField: { width: 92 },
  photoBlock: { alignItems: 'center', gap: space.md },
  photo: {
    width: PHOTO,
    height: PHOTO,
    borderRadius: PHOTO / 2,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fillImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  input: {
    minHeight: 48,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    ...type.body,
  },
  multiline: { minHeight: 88 },
  voices: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  voiceCell: {
    width: '31%',
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  voiceCellOn: { borderColor: colors.primary, backgroundColor: colors.primarySofter },
  dropzone: {
    minHeight: 120,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    padding: space.lg,
  },
  dropText: { maxWidth: 280 },
  samples: { gap: space.sm },
  sampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, alignSelf: 'stretch' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    paddingHorizontal: space.lg,
    height: 34,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.text, borderColor: colors.text },
  dim: { opacity: 0.55 },
});
