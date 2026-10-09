import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, CharacterAvatar, PressableScale, Screen, Sheet, Txt } from '@/components/ui';
import { shortName } from '@/lib/format';
import { dayKey, dayKeyFromToday, dateFromKey } from '@/mock';
import { useAppStore } from '@/store/use-app-store';
import { colors, HEADER_HEIGHT, radius, space, type } from '@/theme';
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
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
    <Screen background={colors.bgPlain}>
      <View style={styles.head}>
        <PressableScale
          style={styles.back}
          scaleTo={0.88}
          hitSlop={8}
          accessibilityLabel={t('a11y.back')}
          onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </PressableScale>
        <Txt variant="h3" lines={1} style={styles.flex}>
          {date === dayKey() ? t('diary.todayPage') : t('diary.myPage')}
        </Txt>
        <PressableScale
          style={styles.date}
          scaleTo={0.95}
          hitSlop={6}
          accessibilityLabel={t('diary.calendar')}
          onPress={() => setDatesOpen(true)}>
          <Txt variant="smallStrong" color={colors.textSecondary}>
            {shortDate(date)}
          </Txt>
          <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
        </PressableScale>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={HEADER_HEIGHT}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled">
          <Txt variant="h3" style={styles.section}>
            {t('diary.mood')}
          </Txt>
          <View style={styles.moods}>
            {MOODS.map((m) => (
              <PressableScale
                key={m}
                scaleTo={0.95}
                dimOnPress={false}
                accessibilityState={{ selected: mood === m }}
                onPress={() => setMood(m)}
                style={[styles.chip, mood === m && styles.selected]}>
                <Txt variant="smallStrong" color={mood === m ? colors.text : colors.textSecondary}>
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
                  <PressableScale key={uri} onLongPress={() => setImages((prev) => prev.filter((u) => u !== uri))}>
                    <Image source={{ uri }} style={styles.image} contentFit="cover" />
                  </PressableScale>
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.tools}>
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

          <Txt variant="h3" style={styles.section}>
            {t('diary.whoReads')}
          </Txt>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.readers}>
            <ReaderOption
              selected={!shareWith}
              label={t('diary.onlyMe')}
              icon={<Ionicons name="lock-closed-outline" size={18} color={colors.text} />}
              onPress={() => setShareWith(undefined)}
            />
            {friends.map((character) => (
              <ReaderOption
                key={character.id}
                selected={shareWith === character.id}
                label={shortName(character.name)}
                icon={<CharacterAvatar character={character} size={26} />}
                onPress={() => setShareWith(character.id)}
              />
            ))}
          </ScrollView>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.xl) }]}>
          <Button label={t('diary.savePage')} size="lg" full onPress={save} />
          <Txt variant="small" color={colors.textSecondary} center>
            {reader ? t('diary.sharedNote', { name: shortName(reader.name) }) : t('diary.privateNote')}
          </Txt>
        </View>
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
function ReaderOption({
  selected,
  label,
  icon,
  onPress,
}: {
  selected: boolean;
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <PressableScale
      style={[styles.option, selected && styles.selected]}
      scaleTo={0.96}
      dimOnPress={false}
      accessibilityState={{ selected }}
      onPress={onPress}>
      {icon}
      <Txt variant="smallStrong" lines={1}>
        {label}
      </Txt>
    </PressableScale>
  );
}

const PAPER_PAD = space.md;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: {
    minHeight: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingLeft: space.sm,
    paddingRight: space.md,
  },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  date: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: space.sm },
  scroll: { paddingHorizontal: space.lg, paddingBottom: space.xl },
  section: { marginTop: space.lg, marginBottom: space.md },
  moods: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    height: 40,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.surfaceAlt,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { backgroundColor: colors.surface, borderColor: colors.text },
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
  tools: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  tool: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolOn: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.text },
  off: { opacity: 0.4 },
  readers: { gap: space.sm, paddingRight: space.lg },
  option: {
    height: 52,
    minWidth: 104,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm - 2,
    paddingHorizontal: space.md,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.surfaceAlt,
    backgroundColor: colors.surfaceAlt,
  },
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
