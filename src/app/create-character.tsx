import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, type ScrollViewInstance, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';

import { actionOf, chatToDefinition, checkIdea, type CharacterDraft, type DraftField, definitionToText, type Spark, textToDefinition } from '@/ai/character-draft';
import { PORTRAITS_AVAILABLE, requestDraft, requestField, requestPortrait } from '@/ai/character-studio';
import { baseLanguage } from '@/ai/reply-language';
import { BOTTOM_BAR_SPACE, BottomBar, Card, Chip, ChipGroup, CreateHead, Disclosure, Field, FieldPair, Rewrite, SmallRound } from '@/components/create/kit';
import { ContinueCard, DotWait, QuickIdea, WritingSteps } from '@/components/create/quick-create';
import { PaywallSheet } from '@/components/paywall-sheet';
import { PressableScale, Screen, Toggle, Txt } from '@/components/ui';
import { createTier, portraitPrice, quickCreatesPerDay } from '@/economy/quick-create';
import { useKeyboardVisible } from '@/hooks/use-keyboard-visible';
import { clearCreation, loadCreation, saveCreation } from '@/lib/create-draft-storage';
import { type CreateForm, type CreateSection, firstProblemSection, hasContent, problemsBySection, sameForm } from '@/lib/create-flow';
import {
  BACKSTORY_MAX,
  BIO_MAX,
  checkCreation,
  MASK_MAX,
  RELATION_MAX,
  SECRET_MAX,
  DEFINITION_MAX,
  GENDERS,
  GREETING_MAX,
  heightOf,
  LOOK_MAX,
  MAX_TRAITS,
  MORE_GREETINGS_MAX,
  NAME_MAX,
  OPENING_MAX,
  QUIRK_MAX,
  reviewAfterEdit,
  ROLES,
  STARTER_MAX,
  STARTERS_MAX,
  STYLES,
  TAGLINE_MAX,
  THING_MAX,
  THINGS_MAX,
  thingsOf,
  TRAITS,
  VOICES,
  type VoiceChoice,
} from '@/lib/create-character';
import { haptic } from '@/lib/haptics';
import { quickCreatesToday, useAppStore } from '@/store/use-app-store';
import { avatarGradients, colors, fonts, space, systemColors, systemGround } from '@/theme';
import type { Character, CharacterCategory, CharacterRole } from '@/types';
import { showAlert } from '@/lib/alert';

const isTrait = (tag: string) => (TRAITS as readonly string[]).includes(tag);
const CATEGORIES: CharacterCategory[] = ['school', 'fantasy', 'idol', 'daily', 'original'];
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
/** How long typing waits before the unfinished character is kept on the phone. */
const SAVE_AFTER_MS = 600;
const SCRIM = ['rgba(0,0,0,0)', 'rgba(0,0,0,0.68)'] as const;
/** "Alisa Vetrova" -> "AV": the same letters their avatar shows without a picture. */
const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?';
/** Their avatar's colours without a picture, so the page, the meet moment and the chat look alike. */
const gradientOf = (accent: number) => avatarGradients[accent % avatarGradients.length];

/**
 * Sharing a creation in Find is off until moderation exists (business-plan §12, decision 4: no UGC
 * market at launch; audit 2026-10-13). While false every creation is saved private.
 */
const SHARING_OPEN = false;

/** Non-empty lines, trimmed; undefined when none are left, so the field is cleared. */
const cleanList = (list: string[]) => {
  const kept = list.map((line) => line.trim()).filter(Boolean);
  return kept.length > 0 ? kept : undefined;
};

/** A blank new character. */
const BLANK: CreateForm = {
  photoRights: false,
  name: '',
  tagline: '',
  age: '',
  traits: [],
  style: 'casual',
  role: 'friend',
  bio: '',
  look: '',
  quirk: '',
  greeting: '',
  opening: '',
  greetings: [],
  definition: '',
  starters: [],
  height: '',
  backstory: '',
  likes: '',
  dislikes: '',
  opinions: [],
  preset: 'warm',
  category: 'original',
  relation: '',
  mask: '',
  secret: '',
  history: '',
  exception: '',
  arcBeats: [],
  arcFor: '',
};

/** A character the user made, as the form holds it. */
function formOf(c: Character): CreateForm {
  return {
    imageUri: c.avatarUri,
    photoRights: !!c.avatarUri,
    name: c.name,
    tagline: c.tagline ?? '',
    gender: c.gender,
    age: c.age != null ? String(c.age) : '',
    traits: c.tags.filter(isTrait),
    style: c.speakingStyle ?? 'casual',
    role: c.role ?? 'friend',
    bio: c.bio,
    look: c.look ?? '',
    quirk: c.quirk ?? '',
    greeting: c.greeting,
    opening: c.opening ?? '',
    greetings: c.greetings ?? [],
    definition: c.definition ?? '',
    starters: c.starters ?? [],
    height: c.heightCm != null ? String(c.heightCm) : '',
    backstory: c.backstory ?? '',
    likes: (c.likes ?? []).join(', '),
    dislikes: (c.dislikes ?? []).join(', '),
    opinions: c.opinions ?? [],
    preset: c.voicePreset,
    category: c.category,
    relation: c.relation ?? '',
    mask: c.mask ?? '',
    secret: c.arc?.secret ?? '',
    history: c.history ?? '',
    exception: c.exception ?? '',
    arcBeats: c.arc?.beats ?? [],
    arcFor: c.arc?.secret ?? '',
  };
}

/** A written draft as the form holds it; the photo and its rights stay as they were. */
const fromDraft = (form: CreateForm, d: CharacterDraft): CreateForm => ({
  ...form,
  name: d.name,
  tagline: d.tagline,
  gender: d.gender,
  age: String(d.age),
  traits: d.tags.filter(isTrait).slice(0, MAX_TRAITS),
  style: d.speakingStyle,
  role: d.role,
  bio: d.bio,
  look: d.look,
  quirk: d.quirk,
  greeting: d.greeting,
  opening: d.opening,
  greetings: d.greetings,
  definition: d.definition,
  starters: d.starters,
  height: d.heightCm != null ? String(d.heightCm) : '',
  backstory: d.backstory,
  likes: d.likes.join(', '),
  dislikes: d.dislikes.join(', '),
  opinions: d.opinions,
  preset: d.voicePreset,
  relation: d.relation,
  mask: d.mask,
  secret: d.arc?.secret ?? '',
  history: d.history,
  exception: d.exception,
  arcBeats: d.arc?.beats ?? [],
  arcFor: d.arc?.secret ?? '',
});

/**
 * Make your own character (F15), as one chain (0z149, owner: "very easy to use, and everything
 * inside really works"; Character.AI's creation chain, teardown §11):
 *
 * 1. The idea: a line or two, up to three sparks, what they are to you. "Write them" (a free draft
 *    a day by plan) or "Fill in myself".
 * 2. The draft being written (busy: say so and stay on the idea, never a stock draft).
 * 3. One review page of cards: their picture and name on top (Find's photo card), then Basics,
 *    Personality, First message, Their story, Voice and More details. ✦ writes any field again.
 *    Create checks the whole page and takes the user to the first card that needs something.
 * 4. "Meet them": their face and first message, then the chat.
 *
 * Back walks the chain back (review → idea → out). An unfinished new character is kept on the phone
 * as it is typed (`create-draft-storage.ts`) and offered again on the next visit. `?id=` edits a
 * character the user made: the same page, Save, and a question before changes are dropped.
 * Looks follow design-style §10 "beautiful, not toy-like": the four main tabs' parts on iOS.
 */
export default function CreateCharacterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editId = Array.isArray(id) ? id[0] : id;
  const editing = useAppStore((s) => (editId ? s.characters.find((c) => c.id === editId && !c.isOfficial) : undefined));

  if (editId && !editing) {
    return (
      <Screen background={systemGround.ground}>
        <CreateHead title={t('errors.notFound')} onBack={() => router.back()} />
      </Screen>
    );
  }
  // Keyed so the form starts again from the stored character if it changes underneath.
  return <CharacterForm key={editing?.id ?? 'new'} editing={editing} />;
}

type Phase = 'idea' | 'writing' | 'form' | 'meet';

function CharacterForm({ editing }: { editing?: Character }) {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const keyboardUp = useKeyboardVisible();
  const addCharacter = useAppStore((s) => s.addCharacter);
  const ownWorlds = useAppStore((s) => s.lorebooks);
  const setLoreLink = useAppStore((s) => s.setLoreLink);
  const updateCharacter = useAppStore((s) => s.updateCharacter);
  const locale = useAppStore((s) => s.user.locale);
  const realAi = useAppStore((s) => !!s.settings.realAi);
  const quickLeft = useAppStore((s) => quickCreatesToday(s.quickCreates, s.wallet));
  const takeQuickCreate = useAppStore((s) => s.takeQuickCreate);
  const payForPortrait = useAppStore((s) => s.payForPortrait);
  const subscription = useAppStore((s) => s.wallet.subscription);
  const shells = useAppStore((s) => s.wallet.shells);
  const quickMax = quickCreatesPerDay(subscription, Date.now());
  // Today's drafts are used up but a bigger plan writes more: the button offers one.
  const quickUpsell = quickLeft === 0 && createTier(subscription, Date.now()) !== 'pro';
  const language = baseLanguage(locale);

  const [phase, setPhase] = useState<Phase>(editing ? 'form' : 'idea');
  /** Their avatar colour, chosen once: the page shows the same one the chat will. */
  const [accent] = useState(() => editing?.accentIndex ?? Math.floor(Math.random() * avatarGradients.length));
  const initial = useMemo(() => (editing ? formOf(editing) : BLANK), [editing]);
  const [form, setForm] = useState<CreateForm>(initial);
  const set = useCallback((patch: Partial<CreateForm>) => setForm((f) => ({ ...f, ...patch })), []);

  const [idea, setIdea] = useState('');
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [ideaRole, setIdeaRole] = useState<CharacterRole | undefined>();
  const [ideaProblem, setIdeaProblem] = useState<string | null>(null);
  /** A kept, unfinished character offered on the idea page. */
  const [kept, setKept] = useState<CreateForm | null>(null);
  const [busy, setBusy] = useState<DraftField | null>(null);
  const asked = useRef<Partial<Record<DraftField, number>>>({});
  const [error, setError] = useState<string | null>(null);
  /** After the first Create tap, each card shows what it still needs. */
  const [checked, setChecked] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [ownWorld, setOwnWorld] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  /** Their picture is being drawn (a few seconds): the dot wait instead of a spinner in the button. */
  const [drawing, setDrawing] = useState(false);
  const [paywall, setPaywall] = useState<number | null>(null);
  const [made, setMade] = useState<{ characterId: string; conversationId: string } | null>(null);

  /** Drafts and fields arrive after a wait; one that lands after leaving, or after Back, is dropped. */
  const run = useRef(0);
  const alive = useRef(true);
  useEffect(
    () => () => {
      alive.current = false;
    },
    [],
  );

  // A new character: offer the one left unfinished last time.
  useEffect(() => {
    if (editing) return;
    void loadCreation().then((saved) => {
      if (alive.current && saved) setKept(saved.form);
    });
  }, [editing]);

  // Keep the unfinished new character as it is typed (Android may close the app behind the user).
  useEffect(() => {
    if (editing || phase !== 'form') return;
    const timer = setTimeout(() => void saveCreation(form), SAVE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [editing, form, phase]);

  const scroll = useRef<ScrollViewInstance>(null);
  const sectionY = useRef<Partial<Record<CreateSection, number>>>({});
  const at = (section: CreateSection) => (e: { nativeEvent: { layout: { y: number } } }) => {
    sectionY.current[section] = e.nativeEvent.layout.y;
  };

  /** A cloned voice made before (no stock voice): kept until a stock one is picked. */
  const ownVoice = !!editing && !editing.voicePreset && !form.preset;
  const voice: VoiceChoice | null = ownVoice ? { kind: 'trained' } : form.preset ? { kind: 'preset', preset: form.preset } : null;
  const drawsPortrait = PORTRAITS_AVAILABLE && !editing && !form.imageUri && !!form.look.trim();
  const totalCost = drawsPortrait ? portraitPrice(subscription, Date.now()) : 0;
  const problems = checkCreation({
    name: form.name,
    age: form.age,
    bio: form.bio,
    greeting: form.greeting,
    hasPhoto: !!form.imageUri,
    look: form.look,
    more: [form.tagline, form.opening, form.quirk, ...form.greetings, form.definition, ...form.starters, form.backstory, form.likes, form.dislikes, form.relation, form.mask],
    photoRights: form.photoRights,
    voice,
    voiceConsent: true,
    needsPicture: PORTRAITS_AVAILABLE,
  });
  const shown = checked ? problemsBySection(problems) : {};
  const problemText = (section: CreateSection) => (shown[section] ? t(`createCharacter.problems.${shown[section]}`) : null);
  const changed = editing ? !sameForm(form, initial) : false;

  const leave = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

  /** Back walks the chain back: writing → idea, a new character's page → idea (kept), idea → out; an edit asks first. */
  const back = useCallback(() => {
    if (phase === 'meet') {
      if (made) router.replace(`/chat/${made.conversationId}`);
      return;
    }
    if (phase === 'writing') {
      run.current += 1;
      return setPhase('idea');
    }
    if (phase === 'form' && !editing) {
      void saveCreation(form);
      if (hasContent(form)) setKept(form);
      setError(null);
      return setPhase('idea');
    }
    if (phase === 'form' && editing && changed) {
      return showAlert(t('createCharacter.flow.discardTitle'), undefined, [
        { text: t('createCharacter.flow.keepEditing'), style: 'cancel' },
        { text: t('createCharacter.flow.discard'), style: 'destructive', onPress: leave },
      ]);
    }
    leave();
  }, [phase, editing, changed, form, leave, made, router, t]);

  // Android's back button walks the same chain.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        back();
        return true;
      });
      return () => sub.remove();
    }, [back]),
  );
  // iOS's swipe back would skip the chain: only the idea page (and an untouched edit) may be swiped away.
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: editing ? !changed : phase === 'idea' });
  }, [navigation, editing, changed, phase]);

  const writeDraft = async () => {
    const ideaProblems = checkIdea(idea, sparks);
    if (ideaProblems.length > 0) return setIdeaProblem(t(`createCharacter.quick.problems.${ideaProblems[0]}`));
    if (quickLeft === 0) return setError(t('createCharacter.quick.limit', { max: quickMax }));
    setIdeaProblem(null);
    setError(null);
    setPhase('writing');
    const mine = ++run.current;
    const result = await requestDraft({ idea, sparks, role: ideaRole, language }, realAi);
    if (!alive.current || run.current !== mine) return;
    if (!result.ok) {
      setPhase('idea');
      haptic.error();
      return setIdeaProblem(t(`createCharacter.quick.problems.${result.problem}`));
    }
    // Only a draft that came back counts against today's free ones.
    takeQuickCreate();
    setForm((f) => fromDraft(f, result.draft));
    setChecked(false);
    setKept(null);
    setPhase('form');
    haptic.success();
  };

  /** ✦: one field written again from what the page holds now. Free, and not counted. */
  const rewrite = async (field: DraftField) => {
    if (busy) return;
    setBusy(field);
    setError(null);
    const attempt = (asked.current[field] ?? 0) + 1;
    asked.current[field] = attempt;
    const value = await requestField(
      field,
      {
        name: form.name,
        tagline: form.tagline,
        bio: form.bio,
        look: form.look,
        greeting: form.greeting,
        quirk: form.quirk,
        backstory: form.backstory,
        role: form.role,
        speakingStyle: form.style,
        tags: form.traits,
        gender: form.gender,
        age: Number(form.age) || undefined,
        likes: thingsOf(form.likes),
        dislikes: thingsOf(form.dislikes),
      },
      language,
      attempt,
      realAi,
    );
    if (!alive.current) return;
    setBusy(null);
    if (value == null) {
      haptic.error();
      return setError(t('createCharacter.quick.problems.busy'));
    }
    // What they hide comes back as a whole arc: the secret shows, the beats ride along for it.
    if (typeof value === 'object' && !Array.isArray(value)) return set({ secret: value.secret, arcBeats: value.beats, arcFor: value.secret });
    const text = Array.isArray(value) ? value.join('\n') : value;
    const list = Array.isArray(value) ? value : [value];
    const patch: Partial<CreateForm> =
      field === 'relation'
        ? { relation: text }
        : field === 'mask'
          ? { mask: text }
          : field === 'history'
            ? { history: text }
            : field === 'exception'
              ? { exception: text }
              : field === 'tagline'
        ? { tagline: text }
        : field === 'bio'
          ? { bio: text }
          : field === 'look'
            ? { look: text }
            : field === 'greeting'
              ? { greeting: text }
              : field === 'opening'
                ? { opening: text }
                : field === 'quirk'
                  ? { quirk: text }
                  : field === 'greetings'
                    ? { greetings: list }
                    : field === 'starters'
                      ? { starters: list }
                      : field === 'backstory'
                        ? { backstory: text }
                        : field === 'likes'
                          ? { likes: list.join(', ') }
                          : field === 'dislikes'
                            ? { dislikes: list.join(', ') }
                            : field === 'opinions'
                              ? { opinions: list }
                              : { definition: text };
    set(patch);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: true, aspect: [4, 5] });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    if ((asset.fileSize ?? 0) > MAX_IMAGE_BYTES) return setError(t('createCharacter.imageTooLarge'));
    setError(null);
    // A new picture needs its own rights check.
    set({ imageUri: asset.uri, photoRights: false });
  };

  /** Character.AI's "insert a chat": the latest lines of your chat with them join the sample dialog. */
  const addFromChat = () => {
    if (!editing) return;
    const s = useAppStore.getState();
    const conversation = s.conversations.find((c) => c.characterId === editing.id);
    const lines = (conversation ? (s.messages[conversation.id] ?? []) : [])
      .filter((m) => m.kind === 'text' && !m.card && m.text)
      .map((m) => ({ author: m.author, text: m.text ?? '' }));
    const next = chatToDefinition(form.definition, lines);
    if (next.added === 0) return setError(t('createCharacter.dialogNoChat'));
    setError(null);
    set({ definition: next.definition });
    haptic.success();
  };

  /** What the page says about the character; creating and saving write the same fields. */
  const fields = () => {
    const clean = form.name.trim();
    return {
      name: clean,
      tagline: form.tagline.trim() || undefined,
      bio: form.bio.trim() || t('createCharacter.defaultBio', { traits: form.traits.join(', ') || t('createCharacter.styles.casual') }),
      look: form.look.trim() || undefined,
      category: form.category,
      gender: form.gender,
      avatarUri: form.imageUri,
      greeting: form.greeting.trim() || t('createCharacter.defaultGreeting', { name: clean }),
      opening: actionOf(form.opening) || undefined,
      quirk: form.quirk.trim() || undefined,
      greetings: cleanList(form.greetings),
      definition: form.definition.trim() || undefined,
      starters: cleanList(form.starters),
      heightCm: heightOf(form.height),
      backstory: form.backstory.trim() || undefined,
      likes: thingsOf(form.likes),
      dislikes: thingsOf(form.dislikes),
      // Left out when none, so an edit never wipes the ones filled in later (`ensureOpinions`).
      ...(form.opinions.length ? { opinions: form.opinions } : {}),
      tags: [...form.traits, ...(editing?.tags ?? []).filter((tag) => !isTrait(tag))],
      age: Number(form.age),
      speakingStyle: form.style,
      role: form.role,
      voicePreset: ownVoice ? undefined : form.preset,
      visibility: 'private' as const,
      // Who they are to the user (Cast 2.0). A secret keeps its beats only if they were written for it;
      // a new one goes with none, and the model writes them once (`ensureStory` in the store).
      relation: form.relation.trim() || undefined,
      mask: form.mask.trim() || undefined,
      history: form.history.trim() || undefined,
      exception: form.exception.trim() || undefined,
      arc: form.secret.trim() ? { secret: form.secret.trim(), beats: form.secret.trim() === form.arcFor.trim() ? form.arcBeats : [] } : undefined,
    };
  };

  const submit = async () => {
    if (problems.length > 0) {
      setChecked(true);
      haptic.error();
      const section = firstProblemSection(problems);
      const y = section ? sectionY.current[section] : undefined;
      if (y != null) scroll.current?.scrollTo({ y: Math.max(0, y - space.md), animated: true });
      return;
    }
    if (totalCost > 0 && shells < totalCost) return setPaywall(totalCost);
    setError(null);
    if (editing) {
      const next = fields();
      const same = (a?: string[], b?: string[]) => (a ?? []).join('\n') === (b ?? []).join('\n');
      // The sample dialog and the looks stay private; everything else here is on their card or chat.
      const seenByOthers =
        next.name !== editing.name ||
        next.tagline !== editing.tagline ||
        next.bio !== editing.bio ||
        next.greeting !== editing.greeting ||
        next.opening !== editing.opening ||
        !same(next.greetings, editing.greetings) ||
        !same(next.starters, editing.starters) ||
        next.backstory !== editing.backstory ||
        next.relation !== editing.relation ||
        !same(next.likes, editing.likes) ||
        !same(next.dislikes, editing.dislikes) ||
        next.avatarUri !== editing.avatarUri;
      updateCharacter(editing.id, { ...next, review: reviewAfterEdit(editing, SHARING_OPEN && editing.visibility === 'public', seenByOthers) });
      haptic.success();
      return leave();
    }
    setCreating(true);
    // Without a photo their picture is drawn from their looks, once, and paid for only if it came back.
    let avatarUri = form.imageUri;
    if (drawsPortrait) {
      setDrawing(true);
      const drawn = await requestPortrait(form.look);
      if (!alive.current) return;
      setDrawing(false);
      if (drawn && payForPortrait()) avatarUri = drawn;
    }
    const ids = addCharacter({
      ...fields(),
      avatarUri,
      handle: '@you',
      series: 'My Creations',
      accentIndex: accent,
      voiceReady: true,
      isOfficial: false,
    });
    if (ownWorld) setLoreLink(ownWorld, ids.characterId, true);
    void clearCreation();
    setCreating(false);
    setMade(ids);
    setPhase('meet');
    haptic.success();
  };

  const label = (key: string) => t(`createCharacter.${key}`);
  const rewriteLabel = (field: string) => t('createCharacter.rewrite', { field: field.toLowerCase() });
  const sparkle = (field: DraftField, name: string) => <Rewrite label={rewriteLabel(name)} busy={busy === field} disabled={busy != null && busy !== field} onPress={() => void rewrite(field)} />;
  const dialogLabels = { char: form.name.trim() || t('createCharacter.dialogChar'), other: t('createCharacter.dialogOther') };

  if (phase === 'meet' && made) {
    return <MeetMoment form={form} accent={accent} onOpen={() => router.replace(`/chat/${made.conversationId}`)} />;
  }

  const title = editing ? t('createCharacter.editTitle') : t('createCharacter.title');

  return (
    <Screen background={systemGround.ground}>
      <CreateHead title={title} onBack={back} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {phase === 'writing' ? (
          <WritingSteps />
        ) : drawing ? (
          <DotWait title={t('createCharacter.quick.drawing')} />
        ) : phase === 'idea' ? (
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: BOTTOM_BAR_SPACE + space.xl }}>
            {kept ? (
              <ContinueCard
                name={kept.name.trim()}
                onContinue={() => {
                  setForm({ ...BLANK, ...kept });
                  setKept(null);
                  setChecked(false);
                  setPhase('form');
                }}
                onDrop={() => {
                  setKept(null);
                  setForm(BLANK);
                  void clearCreation();
                }}
              />
            ) : null}
            <QuickIdea
              idea={idea}
              onIdea={(v) => {
                setIdea(v);
                if (ideaProblem) setIdeaProblem(null);
              }}
              sparks={sparks}
              onSparks={setSparks}
              role={ideaRole}
              onRole={setIdeaRole}
              problem={ideaProblem}
            />
          </ScrollView>
        ) : (
          <ScrollView ref={scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: BOTTOM_BAR_SPACE + space.xl }}>
            {/* Their picture and name, as Find shows a character: tap to choose a photo. */}
            <View onLayout={at('who')}>
              <PressableScale onPress={() => void pickImage()} scaleTo={0.985} accessibilityRole="button" accessibilityLabel={label(form.imageUri ? 'flow.changePhoto' : 'flow.addPhoto')} style={styles.hero}>
                {form.imageUri ? (
                  <Image source={{ uri: form.imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
                ) : (
                  <LinearGradient colors={gradientOf(accent)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, styles.heroCenter]}>
                    <Txt style={styles.initial} maxFontSizeMultiplier={1}>
                      {initialsOf(form.name)}
                    </Txt>
                  </LinearGradient>
                )}
                <LinearGradient colors={SCRIM} style={styles.heroScrim} />
                <View style={styles.heroFoot}>
                  <Txt style={styles.heroName} lines={1} maxFontSizeMultiplier={1.2}>
                    {form.name.trim() || label('namePlaceholder')}
                  </Txt>
                  {form.tagline.trim() ? (
                    <Txt style={styles.heroLine} lines={2}>
                      {form.tagline}
                    </Txt>
                  ) : null}
                </View>
                <View style={styles.photoButton}>
                  <Ionicons name="camera" size={16} color={colors.onMedia} />
                  <Txt style={styles.photoButtonText}>{label(form.imageUri ? 'flow.changePhoto' : 'flow.addPhoto')}</Txt>
                </View>
              </PressableScale>
            </View>

            <Card title={label('basics')} problem={problemText('who')}>
              <Field label={label('name')} value={form.name} onChange={(name) => set({ name })} placeholder={label('namePlaceholder')} max={NAME_MAX} />
              <Field label={label('tagline')} value={form.tagline} onChange={(tagline) => set({ tagline })} placeholder={label('taglinePlaceholder')} max={TAGLINE_MAX} multiline rows={1} action={sparkle('tagline', label('tagline'))} />
              <FieldPair>
                <View style={styles.flex}>
                  <Field label={label('age')} value={form.age} onChange={(v) => set({ age: v.replace(/[^0-9]/g, '') })} placeholder="18+" max={3} keyboardType="number-pad" />
                </View>
                <View style={styles.flex}>
                  <Field label={label('height')} value={form.height} onChange={(v) => set({ height: v.replace(/[^0-9]/g, '') })} placeholder={label('heightPlaceholder')} max={3} keyboardType="number-pad" />
                </View>
              </FieldPair>
              <ChipGroup label={label('gender')}>
                {GENDERS.map((g) => (
                  <Chip key={g} label={t(`find.who.${g}`)} on={form.gender === g} onPress={() => set({ gender: form.gender === g ? undefined : g })} />
                ))}
              </ChipGroup>
              <Field label={label('look')} value={form.look} onChange={(look) => set({ look })} placeholder={label('lookPlaceholder')} max={LOOK_MAX} multiline rows={2} action={sparkle('look', label('look'))} />
              {form.imageUri ? (
                <View style={styles.toggleRow}>
                  <Txt style={[styles.toggleText, styles.flex]}>{label('photoRights')}</Txt>
                  <Toggle value={form.photoRights} onChange={(photoRights) => set({ photoRights })} onColor={systemColors.green} accessibilityLabel={label('photoRights')} />
                </View>
              ) : null}
            </Card>

            <Card title={label('personality')} problem={problemText('personality')} onLayout={at('personality')}>
              <ChipGroup label={t('createCharacter.traitsCount', { count: form.traits.length, max: MAX_TRAITS })}>
                {TRAITS.map((trait) => {
                  const on = form.traits.includes(trait);
                  return (
                    <Chip
                      key={trait}
                      label={t(`createCharacter.traitNames.${trait}`)}
                      on={on}
                      onPress={() => set({ traits: on ? form.traits.filter((x) => x !== trait) : form.traits.length < MAX_TRAITS ? [...form.traits, trait] : form.traits })}
                    />
                  );
                })}
              </ChipGroup>
              <ChipGroup label={label('role')}>
                {ROLES.map((r) => (
                  <Chip key={r} label={t(`createCharacter.roles.${r}`)} on={form.role === r} onPress={() => set({ role: r })} />
                ))}
              </ChipGroup>
              <ChipGroup label={label('style')}>
                {STYLES.map((s) => (
                  <Chip key={s} label={t(`createCharacter.styles.${s}`)} on={form.style === s} onPress={() => set({ style: s })} />
                ))}
              </ChipGroup>
              <Field label={label('persona')} value={form.bio} onChange={(bio) => set({ bio })} placeholder={label('personaPlaceholder')} max={BIO_MAX} multiline rows={4} action={sparkle('bio', label('persona'))} />
              <Field label={label('quirk')} value={form.quirk} onChange={(quirk) => set({ quirk })} placeholder={label('quirkPlaceholder')} max={QUIRK_MAX} multiline rows={2} action={sparkle('quirk', label('quirk'))} />
            </Card>

            <Card title={label('flow.firstMessage')} right={sparkle('greeting', label('greeting'))} onLayout={at('first')}>
              <Field label={label('greeting')} hideLabel value={form.greeting} onChange={(greeting) => set({ greeting })} placeholder={label('greetingPlaceholder')} max={GREETING_MAX} multiline rows={3} />
              <Field label={label('opening')} value={form.opening} onChange={(opening) => set({ opening })} placeholder={label('openingPlaceholder')} max={OPENING_MAX} action={sparkle('opening', label('opening'))} />
              <Lines
                label={t('createCharacter.moreGreetings', { count: form.greetings.length, max: MORE_GREETINGS_MAX })}
                lines={form.greetings}
                onChange={(greetings) => set({ greetings })}
                max={MORE_GREETINGS_MAX}
                size={GREETING_MAX}
                placeholder={label('greetingPlaceholder')}
                addLabel={label('addGreeting')}
                action={sparkle('greetings', label('addGreeting'))}
              />
            </Card>

            <Card title={label('youTwo')}>
              <Field label={label('relation')} value={form.relation} onChange={(relation) => set({ relation })} placeholder={label('relationPlaceholder')} max={RELATION_MAX} action={sparkle('relation', label('relation'))} />
              <Field label={label('mask')} value={form.mask} onChange={(mask) => set({ mask })} placeholder={label('maskPlaceholder')} max={MASK_MAX} multiline rows={2} action={sparkle('mask', label('mask'))} />
              <Field label={label('secret')} value={form.secret} onChange={(secret) => set({ secret })} placeholder={label('secretPlaceholder')} max={SECRET_MAX} multiline rows={2} action={sparkle('arc', label('secret'))} />
            </Card>

            <Card title={label('story')} onLayout={at('story')}>
              <Field label={label('backstory')} value={form.backstory} onChange={(backstory) => set({ backstory })} placeholder={label('backstoryPlaceholder')} max={BACKSTORY_MAX} multiline rows={3} action={sparkle('backstory', label('backstory'))} />
              <Field label={t('intro.loves')} value={form.likes} onChange={(likes) => set({ likes })} placeholder={label('likesPlaceholder')} max={THINGS_MAX * (THING_MAX + 2)} multiline rows={2} action={sparkle('likes', t('intro.loves'))} />
              <Field label={t('intro.cantStand')} value={form.dislikes} onChange={(dislikes) => set({ dislikes })} placeholder={label('dislikesPlaceholder')} max={THINGS_MAX * (THING_MAX + 2)} multiline rows={2} action={sparkle('dislikes', t('intro.cantStand'))} />
            </Card>

            <Card title={label('voice')} problem={problemText('voice')} onLayout={at('voice')}>
              <ChipGroup>
                {ownVoice || (editing && !editing.voicePreset) ? (
                  <Chip label={label('flow.ownVoice')} on={ownVoice} onPress={() => set({ preset: undefined })} icon={<Ionicons name="mic" size={15} color={ownVoice ? systemGround.ground : systemGround.label} />} />
                ) : null}
                {VOICES.map((v) => (
                  <Chip key={v} label={t(`createCharacter.voices.${v}`)} on={!ownVoice && form.preset === v} onPress={() => set({ preset: v })} />
                ))}
              </ChipGroup>
            </Card>

            <Card onLayout={at('more')}>
              <Disclosure label={label('flow.more')} open={moreOpen} onPress={() => setMoreOpen((o) => !o)} />
              {moreOpen ? (
                <Animated.View entering={FadeInDown.duration(200)}>
                  <View style={styles.fieldHead}>
                    <Txt style={[styles.subLabel, styles.flex]}>{label('dialog')}</Txt>
                    <Ionicons name="lock-closed" size={13} color={colors.textSecondary} accessibilityLabel={label('privateNote')} />
                    {sparkle('dialog', label('dialog'))}
                  </View>
                  <TextInput
                    value={definitionToText(form.definition, dialogLabels)}
                    onChangeText={(text) => set({ definition: textToDefinition(text, dialogLabels) })}
                    placeholder={t('createCharacter.dialogPlaceholder', dialogLabels)}
                    placeholderTextColor={colors.textFaint}
                    style={styles.dialog}
                    maxLength={DEFINITION_MAX}
                    multiline
                    textAlignVertical="top"
                    accessibilityLabel={label('dialog')}
                  />
                  {editing ? (
                    <Pressable onPress={addFromChat} accessibilityRole="button" style={styles.inlineAction}>
                      <Ionicons name="chatbubbles" size={16} color={colors.brandText} />
                      <Txt style={styles.inlineActionText}>{label('addFromChat')}</Txt>
                    </Pressable>
                  ) : null}
                  <Lines
                    label={t('createCharacter.starters', { count: form.starters.length, max: STARTERS_MAX })}
                    lines={form.starters}
                    onChange={(starters) => set({ starters })}
                    max={STARTERS_MAX}
                    size={STARTER_MAX}
                    placeholder={label('starterPlaceholder')}
                    addLabel={label('addStarter')}
                    action={sparkle('starters', label('addStarter'))}
                  />
                  {!editing && ownWorlds.length ? (
                    <ChipGroup label={t('find.worlds')}>
                      {ownWorlds.map((book) => (
                        <Chip key={book.id} label={book.name} on={ownWorld === book.id} onPress={() => setOwnWorld((x) => (x === book.id ? null : book.id))} />
                      ))}
                    </ChipGroup>
                  ) : null}
                  <ChipGroup label={t('find.category')}>
                    {CATEGORIES.map((key) => (
                      <Chip key={key} label={t(`find.categories.${key}`)} on={form.category === key} onPress={() => set({ category: key })} />
                    ))}
                  </ChipGroup>
                </Animated.View>
              ) : null}
            </Card>
          </ScrollView>
        )}

        {/* One button at the bottom; it hides while typing so the field stays in view. */}
        {phase === 'idea' && !keyboardUp ? (
          <BottomBar
            label={quickUpsell ? t('createCharacter.quick.more') : t('createCharacter.quick.write')}
            left={<Ionicons name="sparkles" size={18} color={colors.textOnPrimary} />}
            disabled={!quickUpsell && (!idea.trim() || quickLeft === 0)}
            error={error}
            onPress={() => (quickUpsell ? router.push('/store/shell?tab=plans') : void writeDraft())}
            caption={quickLeft === 0 ? t('createCharacter.quick.limit', { max: quickMax }) : t('createCharacter.quick.left', { count: quickLeft, max: quickMax })}
            secondary={{
              label: t('createCharacter.quick.manual'),
              onPress: () => {
                setError(null);
                setChecked(false);
                setPhase('form');
              },
            }}
          />
        ) : phase === 'form' && !keyboardUp ? (
          <BottomBar
            label={editing ? t('createCharacter.save') : totalCost > 0 ? t('createCharacter.create', { count: totalCost }) : t('createCharacter.createFree')}
            busy={creating}
            disabled={busy != null || (!!editing && !changed)}
            caption={t('createCharacter.privateNote')}
            error={error}
            onPress={() => void submit()}
          />
        ) : null}
      </KeyboardAvoidingView>

      <PaywallSheet need={paywall} onClose={() => setPaywall(null)} />
    </Screen>
  );
}

/** Up to `max` short lines (more openings, first lines): each can be removed; a row adds the next. */
function Lines({
  label,
  lines,
  onChange,
  max,
  size,
  placeholder,
  addLabel,
  action,
}: {
  label: string;
  lines: string[];
  onChange: (lines: string[]) => void;
  max: number;
  size: number;
  placeholder: string;
  addLabel: string;
  action?: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.lines}>
      <View style={styles.fieldHead}>
        <Txt style={[styles.subLabel, styles.flex]}>{label}</Txt>
        {action}
      </View>
      {lines.map((line, index) => (
        <View key={index} style={styles.lineRow}>
          <TextInput
            value={line}
            onChangeText={(text) => onChange(lines.map((l, i) => (i === index ? text : l)))}
            placeholder={placeholder}
            placeholderTextColor={colors.textFaint}
            style={[styles.lineInput, styles.flex]}
            maxLength={size}
            multiline
            accessibilityLabel={placeholder}
          />
          <SmallRound icon="close" label={t('createCharacter.remove')} onPress={() => onChange(lines.filter((_, i) => i !== index))} color={colors.textSecondary} />
        </View>
      ))}
      {lines.length < max ? (
        <Pressable onPress={() => onChange([...lines, ''])} accessibilityRole="button" style={styles.inlineAction}>
          <Ionicons name="add-circle" size={18} color={colors.brandText} />
          <Txt style={styles.inlineActionText}>{addLabel}</Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

/** "Meet them": their face, their name and the first thing they will say, then the chat. */
function MeetMoment({ form, accent, onOpen }: { form: CreateForm; accent: number; onOpen: () => void }) {
  const { t } = useTranslation();
  const you = useAppStore((s) => s.user.displayName);
  const name = form.name.trim();
  const greeting = (form.greeting.trim() || t('createCharacter.defaultGreeting', { name })).replace(/\{\{user\}\}/g, you);
  return (
    <Screen background={systemGround.ground}>
      <View style={styles.meet}>
        <Animated.View entering={ZoomIn.springify().damping(14)} style={styles.meetFace}>
          {form.imageUri ? (
            <Image source={{ uri: form.imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <LinearGradient colors={gradientOf(accent)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, styles.heroCenter]}>
              <Txt style={styles.meetInitial} maxFontSizeMultiplier={1}>
                {initialsOf(name)}
              </Txt>
            </LinearGradient>
          )}
        </Animated.View>
        <Animated.View entering={FadeIn.delay(220).duration(260)}>
          <Txt style={styles.meetTitle} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
            {t('createCharacter.flow.meet', { name })}
          </Txt>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(420).duration(280)} style={styles.meetBubble}>
          <Txt style={styles.meetBubbleText} lines={5}>
            {greeting}
          </Txt>
        </Animated.View>
      </View>
      <BottomBar label={t('createCharacter.flow.startChat')} onPress={onOpen} left={<Ionicons name="chatbubble" size={18} color={colors.textOnPrimary} />} />
    </Screen>
  );
}

const HERO_H = 300;
const MEET = 148;

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  // Find's featured card: radius 30, a scrim at the foot, the name in heavy rounded white.
  hero: { height: HERO_H, marginHorizontal: space.lg, marginTop: space.sm, borderRadius: 30, overflow: 'hidden', backgroundColor: colors.surfaceAlt },
  heroCenter: { alignItems: 'center', justifyContent: 'center' },
  heroScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' },
  // Their avatar's monogram, white on its colours, set a little high so the name below stays clear.
  initial: { fontFamily: fonts.playful, fontSize: 96, lineHeight: 112, marginTop: -56, color: colors.white },
  heroFoot: { position: 'absolute', left: space.lg, right: space.lg, bottom: 18 },
  heroName: { fontFamily: fonts.playful, fontSize: 30, lineHeight: 36, color: colors.onMedia },
  heroLine: { marginTop: 2, fontSize: 15, lineHeight: 20, fontWeight: '600', color: colors.onMediaMuted },
  // Clear glass on a photo (Find's "Say hi"); on a colour, the same shape a shade over it.
  photoButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.onMediaGlass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.onMediaHairline,
  },
  photoButtonText: { fontFamily: fonts.playfulBold, fontSize: 14, color: colors.onMedia },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.md },
  toggleText: { fontSize: 15, lineHeight: 20, color: colors.text },
  fieldHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 32, marginTop: space.sm, marginBottom: 6 },
  subLabel: { fontFamily: fonts.playfulBold, fontSize: 14, color: colors.textSecondary },
  dialog: { minHeight: 140, padding: 14, borderRadius: 14, backgroundColor: systemGround.fill, fontSize: 16, lineHeight: 22, color: colors.text },
  inlineAction: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, alignSelf: 'flex-start' },
  inlineActionText: { fontFamily: fonts.playfulBold, fontSize: 15, color: colors.brandText },
  lines: { marginTop: space.sm },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.sm },
  lineInput: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: systemGround.fill, fontSize: 16, lineHeight: 21, color: colors.text },
  meet: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl, paddingBottom: 120, gap: space.lg },
  meetFace: { width: MEET, height: MEET, borderRadius: MEET / 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  meetInitial: { fontFamily: fonts.playful, fontSize: 56, lineHeight: 66, color: colors.white },
  meetTitle: { textAlign: 'center', fontFamily: fonts.playful, fontSize: 30, lineHeight: 36, color: systemGround.label },
  // Their first message as the chat shows theirs: a white bubble.
  meetBubble: { maxWidth: '92%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 22, borderBottomLeftRadius: 6, backgroundColor: systemGround.card },
  meetBubbleText: { fontSize: 17, lineHeight: 23, color: colors.text },
});
