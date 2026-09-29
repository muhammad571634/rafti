import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  Button,
  CharacterAvatar,
  Chip,
  Header,
  Mascot,
  PressableScale,
  Screen,
  Sheet,
  Txt,
} from '@/components/ui';
import { diaryDate } from '@/lib/format';
import { dayKey, dayKeyFromToday, dateFromKey } from '@/mock';
import { useAppStore } from '@/store/use-app-store';
import { colors, palette, radius, shadows, space, type } from '@/theme';
import type { DiaryMood } from '@/types';

type Mark = 'bold' | 'underline' | 'strike' | 'italic';

const MOODS: DiaryMood[] = ['happy', 'soft', 'blue', 'excited', 'tired'];
const MAX_IMAGES = 3;

/**
 * The page itself stays as bare as the reference — grid paper, a sticker and the
 * format bar. Who gets to read it is asked on Save.
 */
export default function DiaryWriteScreen() {
  const { t } = useTranslation();
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
  const [saveOpen, setSaveOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);

  const friends = useMemo(
    () => characters.filter((c) => conversations.some((conv) => conv.characterId === c.id)),
    [characters, conversations],
  );

  const toggleMark = (mark: Mark) =>
    setMarks((prev) => (prev.includes(mark) ? prev.filter((m) => m !== mark) : [...prev, mark]));

  const addImage = async () => {
    if (images.length >= MAX_IMAGES) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    const uri = result.canceled ? undefined : result.assets[0]?.uri;
    if (uri) setImages((prev) => [...prev, uri]);
  };

  const save = () => {
    addDiaryEntry({
      date,
      title: body.trim().split('\n')[0].slice(0, 60),
      body: body.trim(),
      mood,
      images,
      sharedWithCharacterId: shareWith,
      accentIndex: MOODS.indexOf(mood),
    });
    setSaveOpen(false);
    router.back();
  };

  return (
    <Screen background={palette.cream100}>
      <GridPaper />

      <Header
        center
        right={
          <PressableScale
            onPress={() => (body.trim() ? setSaveOpen(true) : router.back())}
            hitSlop={8}
            style={styles.save}>
            <Txt variant="bodyStrong">{t('common.save')}</Txt>
          </PressableScale>
        }
      />

      <View style={styles.datePillRow} pointerEvents="box-none">
        <PressableScale style={[styles.datePill, shadows.card]} scaleTo={0.96} onPress={() => setDatesOpen(true)}>
          <Txt variant="smallStrong" color={colors.paperText}>
            {diaryDate(dateFromKey(date).toISOString())}
          </Txt>
          <Ionicons name="chevron-down" size={15} color={colors.textMuted} />
        </PressableScale>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled">
          <View style={styles.paper}>
            <View style={styles.sticker}>
              <Mascot size={40} />
            </View>

            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder={t('diary.writePlaceholder')}
              placeholderTextColor={colors.textFaint}
              style={[
                styles.bodyInput,
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
                    onLongPress={() => setImages((prev) => prev.filter((u) => u !== uri))}>
                    <Image source={{ uri }} style={styles.image} contentFit="cover" />
                  </PressableScale>
                ))}
              </View>
            ) : null}
          </View>
        </ScrollView>

        <View style={styles.toolbarRow}>
          <View style={[styles.toolbar, shadows.card]}>
            <ToolButton label="B" active={marks.includes('bold')} onPress={() => toggleMark('bold')} bold />
            <ToolButton
              label="U"
              active={marks.includes('underline')}
              onPress={() => toggleMark('underline')}
              underline
            />
            <ToolButton label="S" active={marks.includes('strike')} onPress={() => toggleMark('strike')} strike />
            <ToolButton label="I" active={marks.includes('italic')} onPress={() => toggleMark('italic')} italic />
            <PressableScale style={styles.tool} scaleTo={0.88} onPress={addImage}>
              <Ionicons name="image-outline" size={21} color={colors.text} />
            </PressableScale>
          </View>
          <PressableScale style={[styles.collapse, shadows.card]} scaleTo={0.88} onPress={Keyboard.dismiss}>
            <Ionicons name="chevron-up" size={22} color={colors.text} />
          </PressableScale>
        </View>
      </KeyboardAvoidingView>

      <Sheet visible={saveOpen} onClose={() => setSaveOpen(false)} title={t('diary.shareTitle')}>
        <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
          <ShareRow
            selected={!shareWith}
            label={t('diary.shareWithNobody')}
            icon={<Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />}
            onPress={() => setShareWith(undefined)}
          />
          {friends.map((character) => (
            <ShareRow
              key={character.id}
              selected={shareWith === character.id}
              label={t('diary.shareWith', { name: character.name })}
              icon={<CharacterAvatar character={character} size={30} />}
              onPress={() => setShareWith(character.id)}
            />
          ))}
        </ScrollView>

        <Txt variant="smallStrong" style={styles.moodLabel}>
          {t('diary.mood')}
        </Txt>
        <View style={styles.moods}>
          {MOODS.map((m) => (
            <Chip key={m} label={t(`diary.moods.${m}`)} active={mood === m} onPress={() => setMood(m)} />
          ))}
        </View>

        <Button label={t('common.save')} onPress={save} full style={styles.saveButton} />
      </Sheet>

      <Sheet visible={datesOpen} onClose={() => setDatesOpen(false)}>
        {Array.from({ length: 7 }, (_, i) => dayKeyFromToday(-i)).map((key) => (
          <PressableScale
            key={key}
            style={styles.shareRow}
            onPress={() => {
              setDate(key);
              setDatesOpen(false);
            }}>
            <Txt variant="body" style={styles.flex}>
              {diaryDate(dateFromKey(key).toISOString())}
            </Txt>
            {key === date ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
          </PressableScale>
        ))}
      </Sheet>
    </Screen>
  );
}

function ShareRow({
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
    <PressableScale style={styles.shareRow} onPress={onPress} scaleTo={0.98}>
      {icon}
      <Txt variant="body" style={styles.flex}>
        {label}
      </Txt>
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={20}
        color={selected ? colors.primary : colors.textFaint}
      />
    </PressableScale>
  );
}

/** The faint grid printed on the diary page. */
function GridPaper() {
  const { width, height } = useWindowDimensions();
  const step = 22;

  return (
    <View pointerEvents="none" style={styles.grid}>
      {Array.from({ length: Math.ceil(height / step) }, (_, i) => (
        <View key={`h${i}`} style={[styles.gridLine, { top: i * step }]} />
      ))}
      {Array.from({ length: Math.ceil(width / step) }, (_, i) => (
        <View key={`v${i}`} style={[styles.gridLineV, { left: i * step }]} />
      ))}
    </View>
  );
}

function ToolButton({
  label,
  active,
  onPress,
  bold,
  italic,
  underline,
  strike,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
}) {
  return (
    <PressableScale style={[styles.tool, active && styles.toolActive]} onPress={onPress} scaleTo={0.88}>
      <Txt
        variant="h3"
        color={active ? colors.primary : colors.text}
        style={[
          styles.toolLabel,
          bold && styles.bold,
          italic && styles.italic,
          underline && styles.underline,
          strike && styles.strike,
        ]}>
        {label}
      </Txt>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grid: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.paperLine,
    opacity: 0.7,
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.paperLine,
    opacity: 0.55,
  },
  save: { paddingHorizontal: space.md },
  datePillRow: { alignItems: 'center', marginTop: -44, marginBottom: space.md },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.lg,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: palette.cream100,
  },
  scroll: { padding: space.lg, paddingTop: space.xl, paddingBottom: space.huge },
  paper: {
    minHeight: 380,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.paperText,
    padding: space.lg,
    paddingTop: space.xl,
  },
  sticker: { position: 'absolute', top: -24, left: space.lg },
  bodyInput: {
    flex: 1,
    minHeight: 300,
    padding: 0,
    color: colors.paperText,
    ...type.body,
    lineHeight: 24,
  },
  images: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  image: { width: 84, height: 84, borderRadius: radius.md },
  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic' },
  underline: { textDecorationLine: 'underline' },
  strike: { textDecorationLine: 'line-through' },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  toolbar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  tool: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolActive: { backgroundColor: colors.primarySoft },
  toolLabel: { fontWeight: '500' },
  collapse: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: { maxHeight: 260 },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
  },
  moodLabel: { marginTop: space.lg, marginBottom: space.sm },
  moods: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  saveButton: { marginTop: space.xl },
});
