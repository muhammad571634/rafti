import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PaywallSheet } from '@/components/paywall-sheet';
import { BUY_BAR_SPACE, GroupLabel, STORE, StoreBuyBar } from '@/components/plans/store-look';
import {
  Anim,
  GlassBar,
  IconRow,
  InsetGroup,
  LargeTitle,
  PressableScale,
  Screen,
  Segmented,
  ShellIcon,
  Toggle,
  Txt,
  useScrolledPast,
} from '@/components/ui';
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
import { colors, space, systemColors } from '@/theme';
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
 * Sharing a creation in Find is off until moderation exists (business-plan §12, decision 4: no UGC
 * market at launch; audit 2026-10-13). While false the "Who sees them" choice is hidden and every
 * creation is saved private. Turn it on together with the server review queue.
 */
const SHARING_OPEN = false;

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
      <Screen background={colors.bg}>
        <GlassBar />
        <LargeTitle>{t('errors.notFound')}</LargeTitle>
      </Screen>
    );
  }
  // Keyed so the form starts again from the stored character if it changes underneath.
  return <CharacterForm key={editing?.id ?? 'new'} editing={editing} />;
}

function CharacterForm({ editing }: { editing?: Character }) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const addCharacter = useAppStore((s) => s.addCharacter);
  const updateCharacter = useAppStore((s) => s.updateCharacter);
  const spendShells = useAppStore((s) => s.spendShells);
  const shells = useAppStore((s) => s.wallet.shells);
  const { scrolled, onScroll } = useScrolledPast(40);
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
  const [isPublic, setIsPublic] = useState(SHARING_OPEN && editing?.visibility === 'public');
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
    // An iOS form (Contacts' New Contact): inset groups on the grouped grey ground, the Store's bar below.
    <Screen background={colors.bg}>
      <GlassBar title={t(editing ? 'createCharacter.editTitle' : 'createCharacter.title')} scrolled={scrolled} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: BUY_BAR_SPACE + insets.bottom }}
          keyboardShouldPersistTaps="handled">
          <LargeTitle>{t(editing ? 'createCharacter.editTitle' : 'createCharacter.title')}</LargeTitle>

          <View style={styles.hero}>
            <PressableScale
              onPress={pickImage}
              scaleTo={0.95}
              accessibilityRole="button"
              accessibilityLabel={t('createCharacter.uploadImage')}>
              <View style={styles.photo}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.fillImage} contentFit="cover" />
                ) : (
                  <Ionicons name="person" size={52} color={colors.white} />
                )}
              </View>
              <View style={styles.camera} pointerEvents="none">
                <Ionicons name="camera" size={16} color={colors.white} />
              </View>
            </PressableScale>
          </View>
          <InsetGroup>
            <ConsentRow label={t('createCharacter.photoRights')} value={photoRights} onChange={setPhotoRights} />
          </InsetGroup>

          <GroupLabel>{t('createCharacter.basics')}</GroupLabel>
          <InsetGroup>
            <View style={[styles.formRow, styles.line]}>
              <Txt style={styles.formLabel}>{t('createCharacter.name')}</Txt>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t('createCharacter.namePlaceholder')}
                placeholderTextColor={colors.textFaint}
                style={styles.formInput}
                maxLength={NAME_MAX}
                accessibilityLabel={t('createCharacter.name')}
              />
            </View>
            <View style={[styles.formRow, styles.line]}>
              <Txt style={styles.formLabel}>{t('createCharacter.age')}</Txt>
              <TextInput
                value={age}
                onChangeText={(v) => setAge(v.replace(/[^0-9]/g, ''))}
                placeholder="18+"
                placeholderTextColor={colors.textFaint}
                keyboardType="number-pad"
                style={styles.formInput}
                maxLength={3}
                accessibilityLabel={t('createCharacter.age')}
              />
            </View>
            <View style={styles.formRow}>
              <Txt style={styles.formLabel}>{t('createCharacter.gender')}</Txt>
              <View style={styles.genders}>
                {GENDERS.map((g) => (
                  <Pill key={g} label={t(`find.who.${g}`)} active={gender === g} onPress={() => setGender(gender === g ? undefined : g)} />
                ))}
              </View>
            </View>
          </InsetGroup>

          <GroupLabel>
            {`${t('createCharacter.personality')} · ${t('createCharacter.traitsCount', { count: traits.length, max: MAX_TRAITS })}`}
          </GroupLabel>
          <InsetGroup style={styles.pills}>
            {TRAITS.map((trait) => (
              <Pill
                key={trait}
                label={t(`createCharacter.traitNames.${trait}`)}
                active={traits.includes(trait)}
                onPress={() => toggleTrait(trait)}
              />
            ))}
          </InsetGroup>

          <GroupLabel>{t('createCharacter.style')}</GroupLabel>
          <InsetGroup style={styles.pills}>
            {STYLES.map((s) => (
              <Pill key={s} label={t(`createCharacter.styles.${s}`)} active={style === s} onPress={() => setStyle(s)} />
            ))}
          </InsetGroup>

          <GroupLabel>{t('createCharacter.role')}</GroupLabel>
          <InsetGroup style={styles.pills}>
            {ROLES.map((r) => (
              <Pill key={r} label={t(`createCharacter.roles.${r}`)} active={role === r} onPress={() => setRole(r)} />
            ))}
          </InsetGroup>

          <GroupLabel>{t('createCharacter.story')}</GroupLabel>
          <InsetGroup>
            <View style={[styles.area, styles.line]}>
              <Txt style={styles.areaLabel}>{t('createCharacter.persona')}</Txt>
              <TextInput
                value={bio}
                onChangeText={setBio}
                placeholder={t('createCharacter.personaPlaceholder')}
                placeholderTextColor={colors.textFaint}
                style={styles.areaInput}
                maxLength={BIO_MAX}
                multiline
                textAlignVertical="top"
                accessibilityLabel={t('createCharacter.persona')}
              />
            </View>
            <View style={styles.area}>
              <Txt style={styles.areaLabel}>{t('createCharacter.greeting')}</Txt>
              <TextInput
                value={greeting}
                onChangeText={setGreeting}
                placeholder={t('createCharacter.greetingPlaceholder')}
                placeholderTextColor={colors.textFaint}
                style={styles.areaInput}
                maxLength={GREETING_MAX}
                multiline
                textAlignVertical="top"
                accessibilityLabel={t('createCharacter.greeting')}
              />
            </View>
          </InsetGroup>

          <GroupLabel>{t('createCharacter.voice')}</GroupLabel>
          <Segmented
            style={styles.segmented}
            options={[
              { value: 'preset', label: t('createCharacter.voicePreset') },
              { value: 'clone', label: t('createCharacter.voiceClone', { count: shellCosts.characterVoiceClone }) },
            ]}
            value={voiceMode}
            onChange={setVoiceMode}
          />

          {voiceMode === 'preset' ? (
            // A picker list, iOS style: the chosen voice gets the tint check; the wave plays on it.
            <InsetGroup style={styles.groupGap}>
              {VOICES.map((v, i) => (
                <Pressable
                  key={v}
                  onPress={() => setPreset(v)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: preset === v }}
                  style={({ pressed }) => [styles.voiceRow, pressed && styles.pressed]}>
                  <Anim name="voiceWave" size={24} tint={preset === v ? colors.primary : colors.textFaint} />
                  <View style={[styles.voiceBody, i < VOICES.length - 1 && styles.line]}>
                    <Txt style={styles.rowText}>{t(`createCharacter.voices.${v}`)}</Txt>
                    {preset === v ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
                  </View>
                </Pressable>
              ))}
            </InsetGroup>
          ) : (
            <>
              <InsetGroup style={styles.groupGap}>
                <IconRow
                  icon="mic"
                  fill={systemColors.indigo}
                  title={t('createCharacter.addClips')}
                  meta={samples.length > 0 ? t('createCharacter.samples', { count: samples.length }) : undefined}
                  last={samples.length === 0}
                  onPress={samples.length < MAX_SAMPLES ? () => void pickSamples() : undefined}
                />
                {samples.map((sample, index) => (
                  <View key={`${sample.uri}-${index}`} style={[styles.sampleRow, index < samples.length - 1 && styles.line]}>
                    <Ionicons name="musical-note" size={16} color={colors.textSecondary} />
                    <Txt style={[styles.sampleName, styles.flex]} lines={1}>
                      {sample.name}
                    </Txt>
                    <PressableScale
                      hitSlop={14}
                      scaleTo={0.85}
                      accessibilityLabel={t('a11y.removeClip')}
                      onPress={() => setSamples((prev) => prev.filter((_, i) => i !== index))}>
                      <Ionicons name="remove-circle" size={22} color={systemColors.red} />
                    </PressableScale>
                  </View>
                ))}
              </InsetGroup>
              <Txt style={styles.footer}>{t('createCharacter.uploadVoicesBox')}</Txt>
              <InsetGroup style={styles.groupGap}>
                <ConsentRow label={t('createCharacter.voiceConsent')} value={voiceConsent} onChange={setVoiceConsent} />
              </InsetGroup>
            </>
          )}

          <GroupLabel>{t('find.category')}</GroupLabel>
          <InsetGroup style={styles.pills}>
            {CATEGORIES.map((key) => (
              <Pill key={key} label={t(`find.categories.${key}`)} active={category === key} onPress={() => setCategory(key)} />
            ))}
          </InsetGroup>

          {SHARING_OPEN ? (
            <>
              <GroupLabel>{t('createCharacter.visibility')}</GroupLabel>
              <Segmented
                style={styles.segmented}
                options={[
                  { value: 'private', label: t('createCharacter.private') },
                  { value: 'public', label: t('createCharacter.public') },
                ]}
                value={isPublic ? 'public' : 'private'}
                onChange={(v) => setIsPublic(v === 'public')}
              />
            </>
          ) : null}
        </ScrollView>

        {/* The Store's bar: the one button, then one line on what happens next. */}
        <StoreBuyBar
          label={
            creating
              ? t('createCharacter.creating')
              : editing && cost === 0
                ? t('createCharacter.save')
                : cost > 0
                  ? t('createCharacter.create', { count: cost })
                  : t('createCharacter.createFree')
          }
          left={cost > 0 && !creating ? <ShellIcon size={18} /> : undefined}
          disabled={creating}
          caption={t(isPublic ? 'createCharacter.reviewNote' : 'createCharacter.privateNote')}
          onPress={submit}>
          {error ? <Txt style={styles.error}>{error}</Txt> : null}
        </StoreBuyBar>
      </KeyboardAvoidingView>

      <PaywallSheet need={paywall} onClose={() => setPaywall(null)} />
    </Screen>
  );
}

/** One choice as a capsule: system grey, or the Store's tint when chosen. */
function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.94}
      dimOnPress={false}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.pill, active && styles.pillOn]}>
      <Txt style={[styles.pillText, active && styles.pillTextOn]}>{label}</Txt>
    </PressableScale>
  );
}

/** The creator's word on rights and consent: the line, then the platform's own switch. */
function ConsentRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.consent}>
      <Txt style={[styles.consentText, styles.flex]}>{label}</Txt>
      <Toggle value={value} onChange={onChange} onColor={systemColors.green} accessibilityLabel={label} />
    </View>
  );
}

const PHOTO = 112;
const CAMERA = 32;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { alignItems: 'center', paddingTop: space.md, paddingBottom: space.lg },
  photo: {
    width: PHOTO,
    height: PHOTO,
    borderRadius: PHOTO / 2,
    // iOS Contacts' empty photo: a grey disc with a white figure.
    backgroundColor: systemColors.gray2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  camera: {
    position: 'absolute',
    right: -2,
    bottom: 2,
    width: CAMERA,
    height: CAMERA,
    borderRadius: CAMERA / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.bg,
  },
  fillImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  pressed: { backgroundColor: colors.surfaceAlt },
  rowText: { flex: 1, fontSize: 17, letterSpacing: -0.4, color: colors.text },
  formRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: space.md, marginLeft: space.lg, paddingRight: space.lg },
  formLabel: { width: 72, fontSize: 17, letterSpacing: -0.4, color: colors.text },
  formInput: { flex: 1, minHeight: 48, fontSize: 17, letterSpacing: -0.4, color: colors.text, textAlign: 'right' },
  genders: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: space.sm },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, padding: 14 },
  pill: { height: 34, paddingHorizontal: 14, borderRadius: 17, justifyContent: 'center', backgroundColor: systemColors.fill },
  pillOn: { backgroundColor: STORE.tint },
  pillText: { fontSize: 15, letterSpacing: -0.2, color: colors.text },
  pillTextOn: { fontWeight: '600', color: STORE.onTint },
  area: { marginLeft: space.lg, paddingRight: space.lg, paddingTop: 12, paddingBottom: 6 },
  areaLabel: { fontSize: 13, color: colors.textSecondary },
  areaInput: { minHeight: 72, paddingTop: 4, fontSize: 17, lineHeight: 22, letterSpacing: -0.4, color: colors.text },
  segmented: { marginHorizontal: space.lg },
  groupGap: { marginTop: space.md },
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingLeft: space.lg },
  voiceBody: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingRight: space.lg },
  sampleRow: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: space.sm, marginLeft: space.lg, paddingRight: space.lg },
  sampleName: { fontSize: 15, color: colors.text },
  footer: { marginTop: space.sm, marginHorizontal: space.lg * 2, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  consent: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: 10 },
  consentText: { fontSize: 15, lineHeight: 20, letterSpacing: -0.2, color: colors.text },
  error: { fontSize: 13, textAlign: 'center', color: systemColors.red },
});
