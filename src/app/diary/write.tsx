import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { CharacterAvatar, GlassButton, glassStyle, PressableScale, Screen, Sheet, Txt } from '@/components/ui';
import { useFriendName } from '@/hooks/use-friend-name';
import { dayKey, dayKeyFromToday, dateFromKey } from '@/mock';
import { useAppStore } from '@/store/use-app-store';
import { colors, radius, space, type } from '@/theme';
import type { DiaryMood } from '@/types';

type Mark = 'bold' | 'underline' | 'strike' | 'italic';

const MOODS: DiaryMood[] = ['happy', 'soft', 'blue', 'excited', 'tired'];
const MARKS: { mark: Mark; label: string }[] = [
  { mark: 'bold', label: 'B' },
  { mark: 'underline', label: 'U' },
  { mark: 'strike', label: 'S' },
  { mark: 'italic', label: 'I' },
];
const MAX_IMAGES = 3;
/** One ruled line on the paper; the handwriting sits on this pitch. */
const LINE = type.hand.lineHeight ?? 32;
const PAPER = '#FFFDF8';

/**
 * Your own diary page (calm cards, docs/design-style.md): today's mood, the page on ruled
 * paper in handwriting, who may read it, and one Save in the action bar. The date sits in
 * the header and opens the last seven days.
 */
export default function DiaryWriteScreen() {
  const friendName = useFriendName();
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const characters = useAppStore((s) => s.characters);
  const conversations = useAppStore((s) => s.conversations);
  const addDiaryEntry = useAppStore((s) => s.addDiaryEntry);

  const [body, setBody] = useState('');
  const [date, setDate] = useState(dayKey());
  const [marks, setMarks] = useState<Mark[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [mood, setMood] = useState<DiaryMood>('soft');
  const [shareWith, setShareWith] = useState<string | undefined>(undefined);
  const [datesOpen, setDatesOpen] = useState(false);
  const [paperHeight, setPaperHeight] = useState(0);

  const friends = useMemo(
    () => characters.filter((c) => conversations.some((conv) => conv.characterId === c.id)),
    [characters, conversations],
  );
  const reader = friends.find((c) => c.id === shareWith);

  const toggleMark = (mark: Mark) =>
    setMarks((prev) => (prev.includes(mark) ? prev.filter((m) => m !== mark) : [...prev, mark]));

  const addImage = async () => {
    if (images.length >= MAX_IMAGES) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    const uri = result.canceled ? undefined : result.assets[0]?.uri;
    if (uri) setImages((prev) => [...prev, uri]);
  };

  const save = () => {
    // An empty page is not kept: Save just leaves, as before.
    if (!body.trim()) return router.back();
    addDiaryEntry({
      date,
      title: body.trim().split('\n')[0].slice(0, 60),
      body: body.trim(),
      mood,
      images,
      sharedWithCharacterId: shareWith,
      accentIndex: MOODS.indexOf(mood),
    });
    router.back();
  };

  const shortDate = (key: string) =>
    dateFromKey(key).toLocaleDateString(i18n.language, { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <Screen background={colors.bg}>
      {/* iOS Notes-style bar (prototype `DiaryWrite.dc.html`): close, the page and its date, save. */}
      <View style={styles.head}>
        <GlassButton icon="close" accessibilityLabel={t('common.close')} onPress={() => router.back()} />
        <PressableScale
          style={styles.titleWrap}
          scaleTo={0.97}
          accessibilityRole="button"
          accessibilityLabel={`${shortDate(date)}, ${t('diary.calendar')}`}
          onPress={() => setDatesOpen(true)}>
          <Txt style={styles.headTitle} lines={1}>
            {date === dayKey() ? t('diary.todayPage') : t('diary.myPage')}
          </Txt>
          <View style={styles.date}>
            <Txt style={styles.dateText} color={colors.brandText}>
              {shortDate(date)}
            </Txt>
            <Ionicons name="chevron-down" size={11} color={colors.primary} />
          </View>
        </PressableScale>
        <PressableScale
          scaleTo={0.9}
          onPress={save}
          accessibilityRole="button"
          accessibilityLabel={t('diary.savePage')}
          style={styles.save}>
          <Ionicons name="checkmark" size={22} color={colors.textOnPrimary} />
        </PressableScale>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={BAR}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled">
          <Txt style={styles.section}>{t('diary.mood')}</Txt>
          <View style={styles.moods}>
            {MOODS.map((m) => (
              <PressableScale
                key={m}
                scaleTo={0.95}
                dimOnPress={false}
                accessibilityState={{ selected: mood === m }}
                onPress={() => setMood(m)}
                style={[styles.chip, mood === m && styles.selected]}>
                <Txt style={styles.chipText} color={mood === m ? colors.textOnPrimary : colors.text}>
                  {t(`diary.moods.${m}`)}
                </Txt>
              </PressableScale>
            ))}
          </View>

          <View style={styles.paper} onLayout={(e) => setPaperHeight(e.nativeEvent.layout.height)}>
            {/* Ruled lines under the text, on the same pitch as the handwriting. */}
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              {Array.from({ length: Math.max(0, Math.floor((paperHeight - PAPER_PAD) / LINE)) }, (_, i) => (
                <View key={i} style={[styles.rule, { top: PAPER_PAD + (i + 1) * LINE - 2 }]} />
              ))}
            </View>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder={t('diary.writePlaceholder')}
              placeholderTextColor={colors.textFaint}
              accessibilityLabel={t('diary.myPage')}
              style={[
                styles.input,
                marks.includes('bold') && styles.bold,
                marks.includes('italic') && styles.italic,
                marks.includes('underline') && styles.underline,
                marks.includes('strike') && styles.strike,
              ]}
              multiline
              textAlignVertical="top"
            />
            {images.length ? (
              <View style={styles.images}>
                {images.map((uri) => (
                  <PressableScale
                    key={uri}
                    accessibilityRole="image"
                    accessibilityLabel={t('diary.photo')}
                    accessibilityHint={t('diary.removePhotoHint')}
                    accessibilityActions={[{ name: 'longpress', label: t('diary.removePhoto') }]}
                    onAccessibilityAction={() => setImages((prev) => prev.filter((u) => u !== uri))}
                    onLongPress={() => setImages((prev) => prev.filter((u) => u !== uri))}>
                    <Image source={{ uri }} style={styles.image} contentFit="cover" />
                  </PressableScale>
                ))}
              </View>
            ) : null}
          </View>

          <View style={[glassStyle, styles.tools]}>
            {MARKS.map(({ mark, label }) => (
              <PressableScale
                key={mark}
                style={[styles.tool, marks.includes(mark) && styles.toolOn]}
                scaleTo={0.88}
                accessibilityState={{ selected: marks.includes(mark) }}
                onPress={() => toggleMark(mark)}>
                <Txt
                  variant="bodyStrong"
                  style={[
                    mark === 'bold' && styles.bold,
                    mark === 'italic' && styles.italic,
                    mark === 'underline' && styles.underline,
                    mark === 'strike' && styles.strike,
                  ]}>
                  {label}
                </Txt>
              </PressableScale>
            ))}
            <PressableScale
              style={[styles.tool, images.length >= MAX_IMAGES && styles.off]}
              disabled={images.length >= MAX_IMAGES}
              scaleTo={0.88}
              accessibilityLabel={t('a11y.addPhoto')}
              onPress={addImage}>
              <Ionicons name="image-outline" size={20} color={colors.text} />
            </PressableScale>
          </View>

          <Txt style={styles.section}>{t('diary.whoReads')}</Txt>
          <View style={styles.readers}>
            <ReaderOption
              selected={!shareWith}
              label={t('diary.onlyMe')}
              icon={
                <View style={styles.lock}>
                  <Ionicons name="lock-closed" size={14} color={colors.white} />
                </View>
              }
              onPress={() => setShareWith(undefined)}
              last={friends.length === 0}
            />
            {friends.map((character, i) => (
              <ReaderOption
                key={character.id}
                selected={shareWith === character.id}
                label={friendName(character, true)}
                icon={<CharacterAvatar character={character} size={30} />}
                onPress={() => setShareWith(character.id)}
                last={i === friends.length - 1}
              />
            ))}
          </View>
          <Txt style={styles.note}>
            {reader ? t('diary.sharedNote', { name: friendName(reader, true) }) : t('diary.privateNote')}
          </Txt>
        </ScrollView>

      </KeyboardAvoidingView>

      <Sheet visible={datesOpen} onClose={() => setDatesOpen(false)}>
        {Array.from({ length: 7 }, (_, i) => dayKeyFromToday(-i)).map((key) => (
          <PressableScale
            key={key}
            style={styles.dateRow}
            onPress={() => {
              setDate(key);
              setDatesOpen(false);
            }}>
            <Txt variant="body" style={styles.flex}>
              {shortDate(key)}
            </Txt>
            {key === date ? <Ionicons name="checkmark" size={18} color={colors.text} /> : null}
          </PressableScale>
        ))}
      </Sheet>
    </Screen>
  );
}

/** One "who can read it" choice: grey, or white with an ink border when chosen. */
/** One reader in the inset list: the face, the name and a peach tick when chosen. */
function ReaderOption({
  selected,
  label,
  icon,
  last,
  onPress,
}: {
  selected: boolean;
  label: string;
  icon: React.ReactNode;
  last?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.option, pressed && styles.pressed]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}>
      {icon}
      <View style={[styles.optionBody, !last && styles.line]}>
        <Txt style={styles.optionText} lines={1}>
          {label}
        </Txt>
        {selected ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
      </View>
    </Pressable>
  );
}

/** The glass bar's height, for the keyboard offset. */
const BAR = 56;
const PAPER_PAD = space.md;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.xs,
    paddingBottom: space.sm,
  },
  titleWrap: { flex: 1, alignItems: 'center' },
  headTitle: { fontSize: 17, fontWeight: '600', letterSpacing: -0.4 },
  date: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  dateText: { fontSize: 12 },
  save: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryFill, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: space.lg, paddingBottom: space.xl },
  section: { marginTop: 22, marginBottom: 6, marginHorizontal: space.lg, fontSize: 13, color: colors.textSecondary, textTransform: 'uppercase' },
  moods: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontSize: 15 },
  selected: { backgroundColor: colors.primaryFill },
  paper: {
    marginTop: space.lg,
    minHeight: 240,
    paddingHorizontal: space.lg + 4,
    paddingTop: PAPER_PAD,
    paddingBottom: space.md,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: PAPER,
    overflow: 'hidden',
  },
  rule: { position: 'absolute', left: space.lg, right: space.lg, height: 1, backgroundColor: colors.paperLine },
  input: {
    minHeight: LINE * 6,
    padding: 0,
    color: colors.paperText,
    ...type.hand,
  },
  images: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  image: { width: 84, height: 84, borderRadius: radius.md },
  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic' },
  underline: { textDecorationLine: 'underline' },
  strike: { textDecorationLine: 'line-through' },
  // One glass capsule of format buttons, centred under the paper (iOS Notes' format bar).
  tools: { flexDirection: 'row', alignSelf: 'center', gap: 2, height: 44, marginTop: space.md, paddingHorizontal: 4, borderRadius: 22 },
  tool: { width: 40, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  toolOn: { backgroundColor: colors.primarySoft },
  off: { opacity: 0.4 },
  readers: { borderRadius: 14, backgroundColor: colors.surface, overflow: 'hidden' },
  option: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingLeft: space.lg },
  optionBody: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingRight: space.lg },
  optionText: { flex: 1, fontSize: 17, letterSpacing: -0.4 },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  pressed: { backgroundColor: colors.surfaceAlt },
  lock: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.textSecondary, alignItems: 'center', justifyContent: 'center' },
  note: { marginTop: space.sm, marginHorizontal: space.lg, fontSize: 13, color: colors.textSecondary },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  footer: {
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
