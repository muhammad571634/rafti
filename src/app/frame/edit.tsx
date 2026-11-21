import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';

import { InkDock, InkIconButton, InkNavBar, InkSegmented, InkText, PillButton } from '@/components/ink';
import { BoothPicture } from '@/components/photo-booth/booth-picture';
import { StickerGlyph } from '@/components/photo-booth/frame-sticker';
import { PressableScale, Screen, useScrolledPast } from '@/components/ui';
import {
  FRAME_CAPTION_MAX,
  FRAME_COLORS,
  FRAME_NAME_MAX,
  FRAME_PATTERNS,
  FRAME_STICKERS,
  frameLook,
  toggleSticker,
} from '@/lib/frames';
import { useAppStore } from '@/store/use-app-store';
import { signature, space, systemColors } from '@/theme';
import { ink, inkFace, inkGutter, inkRadius } from '@/theme/ink';
import type { UserFrame } from '@/types';
import { confirmAlert as confirm } from '@/lib/alert';

const CARD_PAD = 14;

/**
 * Make a Photo Booth frame (F29), in Ink (0z325): a color, a pattern, up to two stickers and a
 * caption, with the picture updating as you pick. Only pieces, no uploads; free and private. `id`
 * edits a saved frame; pictures already taken keep the frame they were shot in. Photos' blue marks
 * what is picked; the dock holds Save.
 */
export default function FrameEditScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = useAppStore((s) => s.frames.find((f) => f.id === id));
  const characters = useAppStore((s) => s.characters);
  const conversations = useAppStore((s) => s.conversations);
  const saveFrame = useAppStore((s) => s.saveFrame);
  const deleteFrame = useAppStore((s) => s.deleteFrame);
  const { scrolled, onScroll } = useScrolledPast(44);

  const [name, setName] = useState(editing?.name ?? '');
  const [color, setColor] = useState(editing?.color ?? 'pink');
  const [pattern, setPattern] = useState<UserFrame['pattern']>(editing?.pattern ?? 'dots');
  const [stickers, setStickers] = useState<string[]>(editing?.stickers ?? ['sparkles']);
  const [caption, setCaption] = useState(editing?.caption ?? '');

  // The preview shows the friend the user talks to most recently, else the first friend.
  const model = useMemo(() => {
    const recent = [...conversations].sort((a, b) => Date.parse(b.lastMessageAt) - Date.parse(a.lastMessageAt))[0];
    return characters.find((c) => c.id === recent?.characterId) ?? characters[0];
  }, [characters, conversations]);
  const look = frameLook({ color, pattern, stickers, caption: caption || t('frames.captionPlaceholder') });
  const [createdAt] = useState(() => new Date().toISOString());

  // Six stickers in one row inside the card: the card's inner width less five gaps.
  const stickerSize = Math.min(56, (width - inkGutter * 2 - CARD_PAD * 2 - space.sm * 5) / 6);
  const title = editing ? t('frames.titleEdit') : t('frames.titleNew');

  const save = () => {
    saveFrame({ name: name || t('frames.namePlaceholder'), color, pattern, stickers, caption }, editing?.id);
    router.back();
  };

  const remove = () =>
    editing &&
    confirm(
      t('frames.deleteTitle'),
      t('frames.deleteBody'),
      t('frames.delete'),
      () => {
        deleteFrame(editing.id);
        router.back();
      },
      t('common.cancel'),
    );

  return (
    <Screen background={ink.ground}>
      <InkNavBar
        backLabel={t('common.back')}
        onBack={() => router.back()}
        title={title}
        scrolled={scrolled}
        right={editing ? <InkIconButton icon="trash" color={systemColors.red} accessibilityLabel={t('frames.delete')} onPress={remove} /> : undefined}
      />
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: space.xl }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <InkText variant="display" style={styles.title}>
            {title}
          </InkText>

          <View style={[styles.card, styles.previewCard]}>
            <View style={styles.preview}>
              {model ? (
                <BoothPicture
                  photo={{ style: 'polaroid', seed: 0, createdAt, frame: look }}
                  character={model}
                  width={150}
                  style={styles.tilt}
                />
              ) : null}
            </View>
          </View>

          <InkText variant="footnoteStrong" color={ink.text2} style={styles.section}>
            {t('frames.color')}
          </InkText>
          <View style={[styles.card, styles.pad, styles.wrap]}>
            {FRAME_COLORS.map((c) => {
              const on = c.id === color;
              return (
                <PressableScale
                  key={c.id}
                  onPress={() => setColor(c.id)}
                  scaleTo={0.9}
                  accessibilityRole="button"
                  accessibilityLabel={t(`frames.colors.${c.id}`)}
                  accessibilityState={{ selected: on }}
                  style={[styles.swatchRing, on && styles.swatchOn]}>
                  <View style={[styles.swatch, { backgroundColor: c.bg }]} />
                </PressableScale>
              );
            })}
          </View>

          <InkText variant="footnoteStrong" color={ink.text2} style={styles.section}>
            {t('frames.pattern')}
          </InkText>
          <InkSegmented
            options={FRAME_PATTERNS.map((p) => ({ value: p, label: t(`frames.patterns.${p}`) }))}
            value={pattern}
            onChange={setPattern}
            style={styles.gutter}
          />

          <View style={styles.labelRow}>
            <InkText variant="footnoteStrong" color={ink.text2} style={[styles.section, styles.flex]} lines={1}>
              {t('frames.stickers')}
            </InkText>
            <InkText variant="footnote" color={ink.text2} style={styles.labelValue}>
              {t('frames.upTo')}
            </InkText>
          </View>
          <View style={[styles.card, styles.pad, styles.stickers]}>
            {FRAME_STICKERS.map((s) => {
              const on = stickers.includes(s);
              return (
                <PressableScale
                  key={s}
                  onPress={() => setStickers((list) => toggleSticker(list, s))}
                  scaleTo={0.94}
                  accessibilityRole="button"
                  accessibilityLabel={t(`frames.stickerNames.${s}`)}
                  accessibilityState={{ selected: on }}
                  style={[styles.sticker, { width: stickerSize, height: stickerSize }, on && styles.stickerOn]}>
                  <StickerGlyph name={s} size={Math.round(stickerSize * 0.5)} />
                </PressableScale>
              );
            })}
          </View>

          <InkText variant="footnoteStrong" color={ink.text2} style={styles.section}>
            {t('frames.caption')}
          </InkText>
          <View style={styles.card}>
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder={t('frames.captionPlaceholder')}
              placeholderTextColor={ink.placeholder}
              selectionColor={signature.photo.strong}
              accessibilityLabel={t('frames.caption')}
              maxLength={FRAME_CAPTION_MAX}
              style={styles.input}
            />
          </View>

          <InkText variant="footnoteStrong" color={ink.text2} style={styles.section}>
            {t('frames.name')}
          </InkText>
          <View style={styles.card}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t('frames.namePlaceholder')}
              placeholderTextColor={ink.placeholder}
              selectionColor={signature.photo.strong}
              accessibilityLabel={t('frames.name')}
              maxLength={FRAME_NAME_MAX}
              style={styles.input}
            />
          </View>
        </ScrollView>

        <InkDock inFlow>
          <PillButton label={t('frames.save')} onPress={save} />
          <InkText variant="footnote" color={ink.text2} center style={styles.caption}>
            {t('frames.saveHint')}
          </InkText>
        </InkDock>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: { marginTop: 2, marginHorizontal: inkGutter },
  section: { paddingHorizontal: inkGutter + 6, paddingTop: 20, paddingBottom: 8 },
  card: {
    marginHorizontal: inkGutter,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
  },
  previewCard: { marginTop: 18, padding: CARD_PAD },
  // The picture's stage: the ground set into the card.
  preview: { height: 236, borderRadius: 16, borderCurve: 'continuous', backgroundColor: ink.ground, alignItems: 'center', justifyContent: 'center' },
  tilt: { transform: [{ rotate: '-2deg' }] },
  pad: { padding: CARD_PAD },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  gutter: { marginHorizontal: inkGutter },
  labelRow: { flexDirection: 'row', alignItems: 'flex-end' },
  labelValue: { marginBottom: 8, marginRight: inkGutter + 6 },
  swatchRing: { width: 46, height: 46, borderRadius: inkRadius.pill, borderWidth: 2.5, borderColor: 'transparent', padding: 3 },
  swatchOn: { borderColor: signature.photo.strong },
  swatch: { flex: 1, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: ink.line },
  stickers: { flexDirection: 'row', justifyContent: 'space-between' },
  sticker: {
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: 2.5,
    borderColor: 'transparent',
    backgroundColor: ink.ground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerOn: { borderColor: signature.photo.strong },
  input: { minHeight: 50, paddingHorizontal: inkGutter, ...inkFace('body'), color: ink.text },
  caption: { marginTop: 6 },
});
