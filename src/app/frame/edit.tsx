import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ClayIconName } from '@/assets/brand/registry';
import { BoothPicture } from '@/components/photo-booth/booth-picture';
import { featureStyles, FeatureBar } from '@/components/feature/feature-kit';
import { BUY_BAR_SPACE, GroupLabel, StoreBuyBar } from '@/components/plans/store-look';
import { ClayIcon, LargeTitle, PressableScale, Screen, Segmented, Txt } from '@/components/ui';
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
import { colors, signature, space, systemColors, systemGround } from '@/theme';
import type { UserFrame } from '@/types';
import { confirmAlert as confirm } from '@/lib/alert';

const GUTTER = space.lg;
const CARD_PAD = 14;

/**
 * Make a Photo Booth frame (F29): a color, a pattern, up to two stickers and a caption, with the
 * picture updating as you pick. Only pieces, no uploads; free and private. `id` edits a saved
 * frame; pictures already taken keep the frame they were shot in. Photo Booth's look on Apple's
 * white ground (design-style §10): grey cards, Photos' blue for what is picked and for Save.
 */
export default function FrameEditScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = useAppStore((s) => s.frames.find((f) => f.id === id));
  const characters = useAppStore((s) => s.characters);
  const conversations = useAppStore((s) => s.conversations);
  const saveFrame = useAppStore((s) => s.saveFrame);
  const deleteFrame = useAppStore((s) => s.deleteFrame);

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
  const stickerSize = Math.min(56, (width - GUTTER * 2 - CARD_PAD * 2 - space.sm * 5) / 6);

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
    <Screen background={systemGround.ground}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentContainerStyle={{ paddingBottom: BUY_BAR_SPACE + insets.bottom }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <FeatureBar
            backLabel={t('common.back')}
            onBack={() => router.back()}
            right={
              editing ? (
                <PressableScale scaleTo={0.9} accessibilityRole="button" accessibilityLabel={t('frames.delete')} onPress={remove} style={styles.round}>
                  <Ionicons name="trash" size={19} color={systemColors.red} />
                </PressableScale>
              ) : undefined
            }
          />
          <LargeTitle>{editing ? t('frames.titleEdit') : t('frames.titleNew')}</LargeTitle>

          <View style={[featureStyles.card, styles.previewCard]}>
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

          <GroupLabel>{t('frames.color')}</GroupLabel>
          <View style={[featureStyles.card, styles.pad, styles.wrap]}>
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

          <GroupLabel>{t('frames.pattern')}</GroupLabel>
          <Segmented
            options={FRAME_PATTERNS.map((p) => ({ value: p, label: t(`frames.patterns.${p}`) }))}
            value={pattern}
            onChange={setPattern}
            style={styles.gutter}
          />

          <View style={styles.labelRow}>
            <GroupLabel>{t('frames.stickers')}</GroupLabel>
            <Txt style={styles.labelValue}>{t('frames.upTo')}</Txt>
          </View>
          <View style={[featureStyles.card, styles.pad, styles.stickers]}>
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
                  <ClayIcon name={s as ClayIconName} size={Math.round(stickerSize * 0.56)} tile={false} />
                </PressableScale>
              );
            })}
          </View>

          <GroupLabel>{t('frames.caption')}</GroupLabel>
          <View style={featureStyles.card}>
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder={t('frames.captionPlaceholder')}
              placeholderTextColor={systemGround.secondaryLabel}
              accessibilityLabel={t('frames.caption')}
              maxLength={FRAME_CAPTION_MAX}
              style={styles.input}
            />
          </View>

          <GroupLabel>{t('frames.name')}</GroupLabel>
          <View style={featureStyles.card}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t('frames.namePlaceholder')}
              placeholderTextColor={systemGround.secondaryLabel}
              accessibilityLabel={t('frames.name')}
              maxLength={FRAME_NAME_MAX}
              style={styles.input}
            />
          </View>
        </ScrollView>

        <StoreBuyBar label={t('frames.save')} caption={t('frames.saveHint')} onPress={save} look={signature.photo} />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: systemGround.fill },
  previewCard: { marginTop: 18, padding: CARD_PAD, borderRadius: 24 },
  // The picture's stage: the white ground set into the grey card.
  preview: { height: 236, borderRadius: 16, borderCurve: 'continuous', backgroundColor: systemGround.ground, alignItems: 'center', justifyContent: 'center' },
  tilt: { transform: [{ rotate: '-2deg' }] },
  pad: { padding: CARD_PAD },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  gutter: { marginHorizontal: GUTTER },
  labelRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  labelValue: { marginBottom: 6, marginRight: space.lg * 2, fontSize: 13, color: systemGround.secondaryLabel },
  swatchRing: { width: 46, height: 46, borderRadius: 23, borderWidth: 2.5, borderColor: 'transparent', padding: 3 },
  swatchOn: { borderColor: signature.photo.strong },
  swatch: { flex: 1, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong },
  stickers: { flexDirection: 'row', justifyContent: 'space-between' },
  sticker: {
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: 2.5,
    borderColor: 'transparent',
    backgroundColor: systemGround.ground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerOn: { borderColor: signature.photo.strong },
  input: { minHeight: 50, paddingHorizontal: GUTTER, fontSize: 17, letterSpacing: -0.4, color: systemGround.label },
});
