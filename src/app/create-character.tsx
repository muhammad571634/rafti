import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, type ScrollViewInstance, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';

import { actionOf, chatToDefinition, checkIdea, type CharacterDraft, type DraftField, definitionToText, type Spark, textToDefinition } from '@/ai/character-draft';
import { PORTRAITS_AVAILABLE, requestDraft, requestField, requestPortrait } from '@/ai/character-studio';
import { baseLanguage } from '@/ai/reply-language';
import { BOTTOM_BAR_SPACE, BottomBar, Card, Chip, ChipGroup, CreateHead, Disclosure, Field, FieldPair, GreetingMeter, ModeSwitch, Rewrite, SmallRound } from '@/components/create/kit';
import { InkText, PhotoGlassPill } from '@/components/ink';
import { coachGreeting } from '@/lib/greeting-coach';
import { COMMUNITY_OPEN } from '@/lib/community-gate';
import { ContinueCard, DotWait, QuickIdea, WritingSteps } from '@/components/create/quick-create';
import { PaywallSheet } from '@/components/paywall-sheet';
import { ListRow, PressableScale, Screen, Sheet, Toggle, Txt, useScrolledPast } from '@/components/ui';
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
  SCENARIO_MAX,
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
import { avatarGradients, colors, space, systemColors } from '@/theme';
import { ink, inkFace, inkGutter, inkRadius } from '@/theme/ink';
import type { Character, CharacterCategory, CharacterRole } from '@/types';
import { showAlert } from '@/lib/alert';
import { keepCharacterPicture } from '@/lib/character-picture';
import { type StoryTemplate, templateById } from '@/lib/templates';
import { localTemplate } from '@/i18n/content';
import { serverTemplates } from '@/ai/server';
import { withAccount } from '@/ai/account';

const isTrait = (tag: string) => (TRAITS as readonly string[]).includes(tag);
const CATEGORIES: CharacterCategory[] = ['school', 'fantasy', 'idol', 'daily', 'original'];
/** How long typing waits before the unfinished character is kept on the phone. */
const SAVE_AFTER_MS = 600;
const SCRIM = ['rgba(9,9,13,0.20)', 'rgba(9,9,13,0)', 'rgba(9,9,13,0.45)', 'rgba(9,9,13,0.92)'] as const;
const SCRIM_STOPS = [0, 0.32, 0.62, 1] as const;
const FIELD_BG = '#0E0E14';
const FIELD_RIM = 'rgba(255,255,255,0.10)';
const SHARE_TILE_BG = 'rgba(48,209,88,0.16)';
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


/** Non-empty lines, trimmed; undefined when none are left, so the field is cleared. */
const cleanList = (list: string[]) => {
  const kept = list.map((line) => line.trim()).filter(Boolean);
  return kept.length > 0 ? kept : undefined;
};

/** A blank new character. */
const BLANK: CreateForm = {
  name: '',
  tagline: '',
  age: '',
  traits: [],
  style: 'casual',
  role: 'friend',
  bio: '',
  look: '',
  quirk: '',
  scenario: '',
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

/**
 * A story template made the user's own (Find → Make it yours): the form starts filled in from it, and
 * the user changes anything, adds their own picture, and keeps it private.
 */
function formOfTemplate({ card }: StoryTemplate): CreateForm {
  return {
    ...BLANK,
    name: card.name,
    tagline: card.tagline ?? '',
    gender: card.gender,
    age: card.age != null ? String(card.age) : '',
    traits: (card.tags ?? []).filter(isTrait),
    style: card.speakingStyle ?? 'casual',
    role: card.role ?? 'friend',
    bio: card.bio ?? '',
    scenario: card.scenario ?? '',
    greeting: card.greeting,
    opening: card.opening ?? '',
    preset: card.voicePreset ?? 'warm',
    relation: card.relation ?? '',
    mask: card.mask ?? '',
  };
}

/** A character the user made, as the form holds it. */
function formOf(c: Character): CreateForm {
  return {
    imageUri: c.avatarUri,
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
    scenario: c.scenario ?? '',
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
  scenario: d.scenario,
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
  const { id, template: templateParam } = useLocalSearchParams<{ id?: string; template?: string }>();
  const editId = Array.isArray(id) ? id[0] : id;
  const written = templateById((Array.isArray(templateParam) ? templateParam[0] : templateParam) ?? '');
  const template = useMemo(() => (written ? localTemplate(written) : undefined), [written]);
  const editing = useAppStore((s) => (editId ? s.characters.find((c) => c.id === editId && !c.isOfficial) : undefined));

  if (editId && !editing) {
    return (
      <Screen background={ink.ground}>
        <CreateHead title={t('errors.notFound')} onBack={() => router.back()} scrolled />
      </Screen>
    );
  }
  // Keyed so the form starts again from the stored character if it changes underneath.
  return <CharacterForm key={editing?.id ?? template?.id ?? 'new'} editing={editing} template={editing ? undefined : template} />;
}

type Phase = 'idea' | 'writing' | 'form' | 'meet';

function CharacterForm({ editing, template }: { editing?: Character; template?: StoryTemplate }) {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const keyboardUp = useKeyboardVisible();
  const { scrolled, onScroll } = useScrolledPast(34);
  const addCharacter = useAppStore((s) => s.addCharacter);
  const ownWorlds = useAppStore((s) => s.lorebooks);
  const setLoreLink = useAppStore((s) => s.setLoreLink);
  const updateCharacter = useAppStore((s) => s.updateCharacter);
  const shareCharacter = useAppStore((s) => s.shareCharacter);
  // Share in Find (0z300): dev and preview builds, the user's own characters only (never a community copy).
  const canShare = COMMUNITY_OPEN && !editing?.fromCommunity;
  const [share, setShare] = useState(editing?.visibility === 'public');
  const shareChanged = !!editing && share !== (editing.visibility === 'public');
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

  const [phase, setPhase] = useState<Phase>(editing || template ? 'form' : 'idea');
  /** Their avatar colour, chosen once: the page shows the same one the chat will. */
  const [accent] = useState(() => editing?.accentIndex ?? template?.card.accentIndex ?? Math.floor(Math.random() * avatarGradients.length));
  const initial = useMemo(() => (editing ? formOf(editing) : template ? formOfTemplate(template) : BLANK), [editing, template]);
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
  const [photoMenu, setPhotoMenu] = useState(false);
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
    if (editing || template) return;
    void loadCreation().then((saved) => {
      if (alive.current && saved) setKept(saved.form);
    });
  }, [editing, template]);

  // Keep the unfinished new character as it is typed (Android may close the app behind the user).
  useEffect(() => {
    // A story template opened and left untouched is not an unfinished character of theirs.
    if (editing || phase !== 'form' || (template && sameForm(form, initial))) return;
    const timer = setTimeout(() => void saveCreation(form), SAVE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [editing, form, phase, template, initial]);

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
    more: [form.tagline, form.opening, form.quirk, form.scenario, ...form.greetings, form.definition, ...form.starters, form.backstory, form.likes, form.dislikes, form.relation, form.mask],
    voice,
    voiceConsent: true,
    needsPicture: PORTRAITS_AVAILABLE,
  });
  const shown = checked ? problemsBySection(problems) : {};
  const problemText = (section: CreateSection) => (shown[section] ? t(`createCharacter.problems.${shown[section]}`) : null);
  const changed = editing ? !sameForm(form, initial) || shareChanged : false;

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
        scenario: form.scenario,
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
                  : field === 'scenario'
                  ? { scenario: text }
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

  /**
   * Their picture from the gallery or the camera: any picture (owner, 2026-11-19), cropped 4:5, made
   * smaller and kept in the app's own folder. It stays on this phone (creator-ecosystem.md §0).
   */
  const pickImage = async (from: 'library' | 'camera') => {
    setPhotoMenu(false);
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.9, allowsEditing: true, aspect: [4, 5], exif: false };
    if (from === 'camera') {
      const allowed = await ImagePicker.requestCameraPermissionsAsync();
      if (!allowed.granted) {
        return showAlert(t('photoBooth.cameraOff'), undefined, [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('notifications.openSettings'), onPress: () => void Linking.openSettings() },
        ]);
      }
    }
    const result = from === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    setError(null);
    const kept = await keepCharacterPicture(asset.uri);
    if (alive.current) set({ imageUri: kept });
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
      scenario: form.scenario.trim() || undefined,
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
      // Sharing is its own step (`shareCharacter`): an edit keeps what the character had.
      visibility: editing?.visibility ?? ('private' as const),
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
        next.scenario !== editing.scenario ||
        !same(next.greetings, editing.greetings) ||
        !same(next.starters, editing.starters) ||
        next.backstory !== editing.backstory ||
        next.relation !== editing.relation ||
        !same(next.likes, editing.likes) ||
        !same(next.dislikes, editing.dislikes) ||
        next.avatarUri !== editing.avatarUri;
      updateCharacter(editing.id, next);
      // Shared: switched off, switched on, or what others see changed (reviewed again).
      if (canShare && (shareChanged || (share && seenByOthers))) void shareCharacter(editing.id, share);
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
      fromTemplate: template?.id,
    });
    // Made a story template their own: counted once on the server (Find's real numbers).
    if (template) void withAccount((token) => serverTemplates.add(token, template.id, 'own')).catch(() => null);
    if (ownWorld) setLoreLink(ownWorld, ids.characterId, true);
    if (canShare && share) void shareCharacter(ids.characterId, true);
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
  const switchMode = (next: 'idea' | 'form') => {
    if (next === phase) return;
    haptic.selection();
    setError(null);
    if (next === 'idea') {
      void saveCreation(form);
      if (hasContent(form)) setKept(form);
    } else {
      setChecked(false);
    }
    setPhase(next);
  };

  return (
    <Screen background={ink.ground}>
      <CreateHead
        title={title}
        onBack={back}
        scrolled={scrolled}
        right={
          !editing && !drawing && (phase === 'idea' || phase === 'form') ? (
            <ModeSwitch
              mode={phase}
              ideaLabel={t('createCharacter.flow.modeIdea')}
              formLabel={t('createCharacter.flow.modeForm')}
              onChange={switchMode}
            />
          ) : undefined
        }
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {phase === 'writing' ? (
          <WritingSteps />
        ) : drawing ? (
          <DotWait title={t('createCharacter.quick.drawing')} />
        ) : phase === 'idea' ? (
          <ScrollView onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: BOTTOM_BAR_SPACE + space.xl }}>
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
          <ScrollView ref={scroll} onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: BOTTOM_BAR_SPACE + space.xl }}>
            {/* Cinema hero photo card matching Find: tap photo or top-right PhotoGlassPill. */}
            <View onLayout={at('who')} style={styles.heroWrap}>
              <PressableScale onPress={() => setPhotoMenu(true)} scaleTo={0.985} accessibilityRole="button" accessibilityLabel={label(form.imageUri ? 'flow.changePhoto' : 'flow.addPhoto')} style={styles.hero}>
                {form.imageUri ? (
                  <Image source={{ uri: form.imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
                ) : (
                  <LinearGradient colors={gradientOf(accent)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, styles.heroCenter]}>
                    <Txt style={styles.initial} maxFontSizeMultiplier={1}>
                      {initialsOf(form.name)}
                    </Txt>
                  </LinearGradient>
                )}
                <LinearGradient colors={SCRIM} locations={SCRIM_STOPS} style={StyleSheet.absoluteFill} />
                <View style={styles.heroFoot}>
                  <InkText variant="card" color={colors.onMedia} lines={1} style={styles.heroName}>
                    {form.name.trim() || label('namePlaceholder')}
                  </InkText>
                  {form.tagline.trim() ? (
                    <InkText variant="quote" color="rgba(255,255,255,0.78)" lines={2} style={styles.heroLine}>
                      {form.tagline}
                    </InkText>
                  ) : null}
                </View>
              </PressableScale>
              <PhotoGlassPill
                ios="camera.fill"
                icon="camera"
                iconSize={14}
                label={label(form.imageUri ? 'flow.changePhoto' : 'flow.addPhoto')}
                onPress={() => setPhotoMenu(true)}
                style={styles.photoPill}
              />
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
              {/* Where the story begins: a scene card opens a new chat with it (0z296). */}
              <Field label={label('scenario')} value={form.scenario} onChange={(scenario) => set({ scenario })} placeholder={label('scenarioPlaceholder')} max={SCENARIO_MAX} multiline rows={2} action={sparkle('scenario', label('scenario'))} />
              <Field label={label('greeting')} hideLabel value={form.greeting} onChange={(greeting) => set({ greeting })} placeholder={label('greetingPlaceholder')} max={GREETING_MAX} multiline rows={3} />
              {/* How strong the first message is, and the one thing to add (0z295). */}
              <GreetingMeter result={coachGreeting({ greeting: form.greeting, opening: form.opening })} />
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
                  <Chip label={label('flow.ownVoice')} on={ownVoice} onPress={() => set({ preset: undefined })} icon={<Ionicons name="mic" size={15} color={ownVoice ? ink.ground : ink.text} />} />
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
                    <Ionicons name="lock-closed" size={13} color={ink.text2} accessibilityLabel={label('privateNote')} />
                    {sparkle('dialog', label('dialog'))}
                  </View>
                  <TextInput
                    value={definitionToText(form.definition, dialogLabels)}
                    onChangeText={(text) => set({ definition: textToDefinition(text, dialogLabels) })}
                    placeholder={t('createCharacter.dialogPlaceholder', dialogLabels)}
                    placeholderTextColor={ink.placeholder}
                    selectionColor={ink.accent}
                    style={styles.dialog}
                    maxLength={DEFINITION_MAX}
                    multiline
                    textAlignVertical="top"
                    accessibilityLabel={label('dialog')}
                  />
                  {editing ? (
                    <Pressable onPress={addFromChat} accessibilityRole="button" style={styles.inlineAction}>
                      <Ionicons name="chatbubbles" size={16} color={ink.accent} />
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

            {canShare ? (
              <Card>
                <View style={styles.shareRow}>
                  <View style={styles.shareTile}>
                    <Ionicons name="globe-outline" size={17} color={systemColors.green} />
                  </View>
                  <View style={styles.flex}>
                    <Txt style={styles.shareTitle}>{t('community.shareTitle')}</Txt>
                    <Txt style={[styles.shareSub, share && styles.shareSubOn]}>
                      {share ? t('community.shareNote') : t('createCharacter.privateNote')}
                    </Txt>
                  </View>
                  <Toggle value={share} onChange={setShare} onColor={systemColors.green} accessibilityLabel={t('community.shareToggle')} />
                </View>
                {editing?.visibility === 'public' && editing.review ? (
                  <Txt style={[styles.shareSub, styles.shareStatus, editing.review === 'rejected' && styles.shareRefused]}>
                    {editing.review === 'pending'
                      ? t('community.status.pending')
                      : editing.review === 'approved'
                        ? t('community.status.live')
                        : t(`community.status.rejected.${editing.communityReason ?? 'harm'}`)}
                  </Txt>
                ) : null}
              </Card>
            ) : null}
          </ScrollView>
        )}

        {/* One button at the bottom; it hides while typing so the field stays in view. */}
        {phase === 'idea' && !keyboardUp ? (
          <BottomBar
            label={quickUpsell ? t('createCharacter.quick.more') : t('createCharacter.quick.write')}
            left={<Ionicons name="sparkles" size={17} color={!quickUpsell && (!idea.trim() || quickLeft === 0) ? ink.text3 : ink.onAccent} />}
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
            caption={canShare && share ? t('community.shareNote') : t('createCharacter.privateNote')}
            error={error}
            onPress={() => void submit()}
          />
        ) : null}
      </KeyboardAvoidingView>

      <PaywallSheet need={paywall} onClose={() => setPaywall(null)} />
      <Sheet visible={photoMenu} onClose={() => setPhotoMenu(false)} title={label(form.imageUri ? 'flow.changePhoto' : 'flow.addPhoto')}>
        <ListRow title={label('flow.choosePhoto')} left={<Ionicons name="images-outline" size={22} color={colors.text} />} onPress={() => void pickImage('library')} />
        <ListRow title={label('flow.takePhoto')} left={<Ionicons name="camera-outline" size={22} color={colors.text} />} onPress={() => void pickImage('camera')} />
        {form.imageUri ? (
          <ListRow
            title={label('flow.removePhoto')}
            left={<Ionicons name="trash-outline" size={22} color={systemColors.red} />}
            onPress={() => {
              setPhotoMenu(false);
              set({ imageUri: undefined });
            }}
          />
        ) : null}
      </Sheet>
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
            placeholderTextColor={ink.placeholder}
            selectionColor={ink.accent}
            style={[styles.lineInput, styles.flex]}
            maxLength={size}
            multiline
            accessibilityLabel={placeholder}
          />
          <SmallRound icon="close" label={t('createCharacter.remove')} onPress={() => onChange(lines.filter((_, i) => i !== index))} color={ink.text2} />
        </View>
      ))}
      {lines.length < max ? (
        <Pressable onPress={() => onChange([...lines, ''])} accessibilityRole="button" style={styles.inlineAction}>
          <Ionicons name="add-circle" size={18} color={ink.accent} />
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
    <Screen background={ink.ground}>
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
      <BottomBar label={t('createCharacter.flow.startChat')} onPress={onOpen} left={<Ionicons name="chatbubble" size={17} color={ink.onAccent} />} />
    </Screen>
  );
}

const HERO_H = 224;
const MEET = 148;

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  heroWrap: { marginHorizontal: inkGutter, marginTop: 4 },
  hero: {
    height: HERO_H,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: FIELD_RIM,
  },
  heroCenter: { alignItems: 'center', justifyContent: 'center' },
  initial: { ...inkFace('display'), marginTop: -44, color: colors.white },
  heroFoot: { position: 'absolute', left: 16, right: 16, bottom: 14 },
  heroName: { fontSize: 25, lineHeight: 30 },
  heroLine: { marginTop: 2, fontSize: 13.5, lineHeight: 19 },
  photoPill: { position: 'absolute', top: 12, right: 12, minHeight: 34, paddingHorizontal: 12 },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  shareTile: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: SHARE_TILE_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareTitle: { ...inkFace('subStrong'), fontSize: 15.5, color: ink.text },
  shareSub: { ...inkFace('caption'), fontWeight: '400', color: ink.text2, marginTop: 1 },
  shareSubOn: { color: systemColors.green },
  shareStatus: { marginTop: 10 },
  shareRefused: { color: systemColors.red },
  fieldHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 30, marginTop: space.sm, marginBottom: 6 },
  subLabel: { ...inkFace('footnoteStrong'), color: ink.text2 },
  dialog: {
    ...inkFace('body'),
    fontSize: 15,
    lineHeight: 21,
    minHeight: 140,
    padding: 13,
    borderRadius: 15,
    borderCurve: 'continuous',
    backgroundColor: FIELD_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: FIELD_RIM,
    color: ink.text,
  },
  inlineAction: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, alignSelf: 'flex-start' },
  inlineActionText: { ...inkFace('footnoteStrong'), fontSize: 14, color: ink.accent },
  lines: { marginTop: space.sm },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.sm },
  lineInput: {
    ...inkFace('body'),
    fontSize: 15,
    lineHeight: 21,
    minHeight: 44,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 15,
    borderCurve: 'continuous',
    backgroundColor: FIELD_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: FIELD_RIM,
    color: ink.text,
  },
  meet: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl, paddingBottom: 120, gap: space.lg },
  meetFace: {
    width: MEET,
    height: MEET,
    borderRadius: MEET / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: FIELD_RIM,
  },
  meetInitial: { ...inkFace('display'), color: colors.white },
  meetTitle: { ...inkFace('display'), textAlign: 'center', color: ink.text },
  meetBubble: {
    maxWidth: '92%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    borderBottomLeftRadius: 6,
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
  },
  meetBubbleText: { ...inkFace('body'), color: ink.text },
});
