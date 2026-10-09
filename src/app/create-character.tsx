import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { PaywallSheet } from '@/components/paywall-sheet';
import { Anim, Button, Header, PressableScale, Screen, Segmented, Txt } from '@/components/ui';
import {
  BIO_MAX,
  checkCreation,
  GENDERS,
  GREETING_MAX,
  MAX_SAMPLES,
  MAX_TRAITS,
  NAME_MAX,
  reviewAfterEdit,
  ROLES,
  STYLES,
  TRAITS,
  VOICES,
  type VoiceChoice,
} from '@/lib/create-character';
import { shellCosts } from '@/mock';
import { useAppStore } from '@/store/use-app-store';
import { colors, palette, radius, space, type } from '@/theme';
import type {
  Character,
  CharacterCategory,
  CharacterGender,
  CharacterRole,
  SpeakingStyle,
  VoicePreset,
} from '@/types';

const isTrait = (tag: string) => (TRAITS as readonly string[]).includes(tag);

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
 *
 * `?id=<character>` opens the same form to edit a character the user made: every field
 * starts filled, the rights already given stand until the photo or the voice clips
 * change, keeping a cloned voice costs nothing, and a public character goes back to
 * review when what others see changes.
 */
export default function CreateCharacterScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editId = Array.isArray(id) ? id[0] : id;
  const editing = useAppStore((s) => (editId ? s.characters.find((c) => c.id === editId && !c.isOfficial) : undefined));

  if (editId && !editing) {
    return (
      <Screen background={colors.bgPlain}>
        <Header title={t('errors.notFound')} />
      </Screen>
    );
  }
  // Keyed so the form starts again from the stored character if it changes underneath.
  return <CharacterForm key={editing?.id ?? 'new'} editing={editing} />;
}

function CharacterForm({ editing }: { editing?: Character }) {
  const { t } = useTranslation();
  const router = useRouter();
  const addCharacter = useAppStore((s) => s.addCharacter);
  const updateCharacter = useAppStore((s) => s.updateCharacter);
  const spendShells = useAppStore((s) => s.spendShells);
  const shells = useAppStore((s) => s.wallet.shells);
  /** The mock voice training; leaving the screen cancels it, and nothing is charged. */
  const training = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(training.current), []);

  /** The character already has a cloned voice (made with clips, not a stock voice). */
  const hasTrainedVoice = !!editing && !editing.voicePreset;
  /** Tags the form has no chip for (seed or server tags): kept as they are on save. */
  const [otherTags] = useState(() => (editing?.tags ?? []).filter((tag) => !isTrait(tag)));

  const [imageUri, setImageUri] = useState<string | undefined>(editing?.avatarUri);
  const [photoRights, setPhotoRights] = useState(!!editing?.avatarUri);
  const [name, setName] = useState(editing?.name ?? '');
  const [gender, setGender] = useState<CharacterGender | undefined>(editing?.gender);
  const [age, setAge] = useState(editing?.age != null ? String(editing.age) : '');
  const [category, setCategory] = useState<CharacterCategory>(editing?.category ?? 'original');
  const [traits, setTraits] = useState<string[]>(() => (editing?.tags ?? []).filter(isTrait));
  const [style, setStyle] = useState<SpeakingStyle>(editing?.speakingStyle ?? 'casual');
  const [role, setRole] = useState<CharacterRole>(editing?.role ?? 'friend');
  const [bio, setBio] = useState(editing?.bio ?? '');
  const [greeting, setGreeting] = useState(editing?.greeting ?? '');
  const [voiceMode, setVoiceMode] = useState<'preset' | 'clone'>(hasTrainedVoice ? 'clone' : 'preset');
  const [preset, setPreset] = useState<VoicePreset | undefined>(editing?.voicePreset);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [voiceConsent, setVoiceConsent] = useState(hasTrainedVoice);
  const [isPublic, setIsPublic] = useState(editing?.visibility === 'public');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paywall, setPaywall] = useState<number | null>(null);

  const keepsTrainedVoice = voiceMode === 'clone' && hasTrainedVoice && samples.length === 0;
  const voice: VoiceChoice | null = keepsTrainedVoice
    ? { kind: 'trained' }
    : voiceMode === 'clone'
      ? { kind: 'clone', samples: samples.length }
      : preset
        ? { kind: 'preset', preset }
        : null;
  // Only a new clone is paid for.
  const cost = voiceMode === 'clone' && !keepsTrainedVoice ? shellCosts.characterVoiceClone : 0;
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
    // New clips make a new voice; the word given for the old one does not cover them.
    if (editing && accepted.length > 0) setVoiceConsent(false);
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
    // A new picture needs its own rights check.
    if (editing) setPhotoRights(false);
  };

  /** What the form says about the character; creating and saving write the same fields. */
  const fields = () => {
    const clean = name.trim();
    return {
      name: clean,
      bio: bio.trim() || t('createCharacter.defaultBio', { traits: traits.join(', ') || t('createCharacter.styles.casual') }),
      category,
      gender,
      avatarUri: imageUri,
      greeting: greeting.trim() || t('createCharacter.defaultGreeting', { name: clean }),
      tags: [...traits, ...otherTags],
      age: Number(age),
      speakingStyle: style,
      role,
      voicePreset: voiceMode === 'preset' ? preset : undefined,
      visibility: isPublic ? ('public' as const) : ('private' as const),
    };
  };

  const save = (character: Character) => {
    const next = fields();
    const seenByOthers =
      next.name !== character.name ||
      next.bio !== character.bio ||
      next.greeting !== character.greeting ||
      next.avatarUri !== character.avatarUri;
    updateCharacter(character.id, { ...next, review: reviewAfterEdit(character, isPublic, seenByOthers) });
    setCreating(false);
    router.back();
  };

  const submit = () => {
    if (problems.length > 0) return setError(t(`createCharacter.problems.${problems[0]}`));
    // Checked now so the paywall shows at once; charged only when the voice is actually made.
    if (cost > 0 && shells < cost) return setPaywall(cost);

    setCreating(true);
    const finish = () => {
      if (cost > 0 && !spendShells(cost, 'voiceClone')) {
        setCreating(false);
        return setPaywall(cost);
      }
      if (editing) return save(editing);
      const { conversationId } = addCharacter({
        ...fields(),
        handle: '@you',
        series: 'My Creations',
        accentIndex: Math.floor(Math.random() * 6),
        voiceReady: true,
        isOfficial: false,
        review: isPublic ? 'pending' : undefined,
      });
      setCreating(false);
      router.replace(`/chat/${conversationId}`);
    };
    // A new cloned voice trains first (a server job later); anything else is ready now.
    if (cost > 0) training.current = setTimeout(finish, CLONE_MS);
    else finish();
  };

  return (
    <Screen background={colors.bgPlain}>
      <Header title={t(editing ? 'createCharacter.editTitle' : 'createCharacter.title')} />

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
                <View style={styles.photoTile}>
                  <Ionicons name="camera-outline" size={22} color={colors.text} />
                </View>
              )}
            </PressableScale>
            <CheckRow
              checked={photoRights}
              onToggle={() => setPhotoRights((v) => !v)}
              label={t('createCharacter.photoRights')}
            />
          </View>

          <Section title={t('createCharacter.basics')}>
            <Field label={t('createCharacter.name')}>
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
              <Field label={t('createCharacter.age')} style={styles.ageField}>
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
                <View style={styles.options}>
                  {GENDERS.map((g) => (
                    <OptionButton
                      key={g}
                      label={t(`find.who.${g}`)}
                      active={gender === g}
                      onPress={() => setGender(gender === g ? undefined : g)}
                    />
                  ))}
                </View>
              </Field>
            </View>
          </Section>

          <Section
            title={t('createCharacter.personality')}
            right={t('createCharacter.traitsCount', { count: traits.length, max: MAX_TRAITS })}>
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
          </Section>

          <Section title={t('createCharacter.style')}>
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
          </Section>

          <Section title={t('createCharacter.role')}>
            <View style={styles.chips}>
              {ROLES.map((r) => (
                <FormChip key={r} label={t(`createCharacter.roles.${r}`)} active={role === r} onPress={() => setRole(r)} />
              ))}
            </View>
          </Section>

          <Section title={t('createCharacter.story')}>
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
          </Section>

          <Section title={t('createCharacter.voice')}>
            <Segmented
              options={[
                { value: 'preset', label: t('createCharacter.voicePreset') },
                { value: 'clone', label: t('createCharacter.voiceClone', { count: shellCosts.characterVoiceClone }) },
              ]}
              value={voiceMode}
              onChange={setVoiceMode}
            />

            {voiceMode === 'preset' ? (
              <View style={styles.voices}>
                {VOICES.map((v) => (
                  <PressableScale
                    key={v}
                    scaleTo={0.95}
                    onPress={() => setPreset(v)}
                    accessibilityState={{ selected: preset === v }}
                    style={[styles.voiceCell, preset === v && styles.voiceCellOn]}>
                    <Anim name="voiceWave" size={26} tint={preset === v ? colors.text : colors.textFaint} />
                    <Txt variant="smallStrong">{t(`createCharacter.voices.${v}`)}</Txt>
                  </PressableScale>
                ))}
              </View>
            ) : (
              <>
                <PressableScale style={styles.dropzone} onPress={pickSamples} scaleTo={0.98}>
                  <View style={styles.dropTile}>
                    <Ionicons name="mic-outline" size={20} color={colors.text} />
                  </View>
                  <Txt variant="bodyStrong">{t('createCharacter.addClips')}</Txt>
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
          </Section>

          <Section title={t('find.category')}>
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
          </Section>

          <Section title={t('createCharacter.visibility')}>
            <View style={styles.options}>
              <OptionButton label={t('createCharacter.private')} active={!isPublic} onPress={() => setIsPublic(false)} />
              <OptionButton label={t('createCharacter.public')} active={isPublic} onPress={() => setIsPublic(true)} />
            </View>
          </Section>
        </ScrollView>

        {/* Action bar (docs/design-style.md §3): the button, then one line on what happens next. */}
        <View style={styles.actionBar}>
          {error ? (
            <Txt variant="small" color={colors.danger} center>
              {error}
            </Txt>
          ) : null}
          <Button
            label={
              creating
                ? t('createCharacter.creating')
                : editing && cost === 0
                  ? t('createCharacter.save')
                  : cost > 0
                    ? t('createCharacter.create', { count: cost })
                    : t('createCharacter.createFree')
            }
            size="lg"
            onPress={submit}
            loading={creating}
            full
            style={problems.length > 0 && styles.dim}
          />
          <Txt variant="caption" color={colors.textSecondary} center>
            {t(isPublic ? 'createCharacter.reviewNote' : 'createCharacter.privateNote')}
          </Txt>
        </View>
      </KeyboardAvoidingView>

      <PaywallSheet need={paywall} onClose={() => setPaywall(null)} />
    </Screen>
  );
}

/** A calm-cards section: h3 title, an optional count on the right, then its fields. */
function Section({ title, right, children }: { title: string; right?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Txt variant="h3" accessibilityRole="header">
          {title}
        </Txt>
        {right ? (
          <Txt variant="small" color={colors.textSecondary}>
            {right}
          </Txt>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function Field({ label, style, children }: { label: string; style?: object; children: React.ReactNode }) {
  return (
    <View style={[styles.field, style]}>
      <Txt variant="smallStrong" color={colors.textSecondary}>
        {label}
      </Txt>
      {children}
    </View>
  );
}

/** Grey chip; the chosen one turns white with an ink border. */
function FormChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.94}
      dimOnPress={false}
      accessibilityState={{ selected: active }}
      style={[styles.chip, active && styles.selected]}>
      <Txt variant="smallStrong" color={active ? colors.text : colors.textSecondary}>
        {label}
      </Txt>
    </PressableScale>
  );
}

/** One of two equal option buttons (gender, visibility). */
function OptionButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.97}
      dimOnPress={false}
      accessibilityState={{ selected: active }}
      style={[styles.option, active && styles.selected]}>
      <Txt variant="bodyStrong" color={active ? colors.text : colors.textSecondary}>
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
      <View style={[styles.box, checked && styles.boxOn]}>
        {checked ? <Ionicons name="checkmark" size={15} color={colors.textOnPrimary} /> : null}
      </View>
      <Txt variant="small" color={colors.textSecondary} style={styles.flex}>
        {label}
      </Txt>
    </PressableScale>
  );
}

const PHOTO = 112;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.xxl, gap: space.xl + 2 },
  section: { gap: space.md },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  field: { gap: space.xs + 2 },
  pair: { flexDirection: 'row', gap: space.md, alignItems: 'flex-end' },
  ageField: { width: 96 },
  photoBlock: { alignItems: 'center', gap: space.md },
  photo: {
    width: PHOTO,
    height: PHOTO,
    borderRadius: PHOTO / 2,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: palette.gray300,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoTile: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fillImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  input: {
    minHeight: 52,
    paddingHorizontal: space.md + 2,
    paddingVertical: space.sm,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    ...type.body,
  },
  multiline: { minHeight: 96, paddingTop: space.md },
  voices: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  voiceCell: {
    width: '31.5%',
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  voiceCellOn: { borderColor: colors.text },
  dropzone: {
    minHeight: 116,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: palette.gray300,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    padding: space.lg,
  },
  dropTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
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
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 2, alignSelf: 'stretch', paddingVertical: space.xs },
  box: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: palette.gray400,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.text, borderColor: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    paddingHorizontal: space.lg,
    height: 38,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.surfaceAlt,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  options: { flexDirection: 'row', gap: space.sm },
  option: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.surfaceAlt,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { backgroundColor: colors.surface, borderColor: colors.text },
  actionBar: {
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  dim: { opacity: 0.55 },
});
