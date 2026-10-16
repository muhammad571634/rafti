import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ClayIconName } from '@/assets/brand/registry';
import { BoothPicture } from '@/components/photo-booth/booth-picture';
import { Button, ClayIcon, Header, PressableScale, Screen, Txt } from '@/components/ui';
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
import { colors, hitSlop, radius, space, type } from '@/theme';
import type { UserFrame } from '@/types';

/** Alert.alert is a no-op on web; fall back to the browser's confirm there (as in group info). */
function confirm(title: string, message: string, action: string, onConfirm: () => void, cancel: string) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: cancel, style: 'cancel' },
    { text: action, style: 'destructive', onPress: onConfirm },
  ]);
}

/**
 * Make a Photo Booth frame (F29, approved prototype): a color, a pattern, up to two stickers
 * and a caption, with the picture updating as you pick. Only pieces, no uploads; free and
 * private. `id` edits a saved frame; pictures already taken keep the frame they were shot in.
 */
export default function FrameEditScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
    <Screen background={colors.bgPlain}>
      <Header
        title={editing ? t('frames.titleEdit') : t('frames.titleNew')}
        right={
          editing ? (
            <PressableScale
              onPress={remove}
              hitSlop={hitSlop}
              scaleTo={0.88}
              accessibilityRole="button"
              accessibilityLabel={t('frames.delete')}>
              <Ionicons name="trash-outline" size={22} color={colors.text} />
            </PressableScale>
          ) : undefined
        }
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
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

          <View style={styles.section}>
            <Txt variant="h3">{t('frames.color')}</Txt>
            <View style={styles.row}>
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
          </View>

          <View style={styles.section}>
            <Txt variant="h3">{t('frames.pattern')}</Txt>
            <View style={styles.row}>
              {FRAME_PATTERNS.map((p) => {
                const on = p === pattern;
                return (
                  <PressableScale
                    key={p}
                    onPress={() => setPattern(p)}
                    scaleTo={0.96}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={[styles.chip, on && styles.chipOn]}>
                    <Txt variant="bodyStrong" color={on ? colors.text : colors.textSecondary}>
                      {t(`frames.patterns.${p}`)}
                    </Txt>
                  </PressableScale>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.titleRow}>
              <Txt variant="h3" style={styles.flex}>
                {t('frames.stickers')}
              </Txt>
              <Txt variant="small" color={colors.textSecondary}>
                {t('frames.upTo')}
              </Txt>
            </View>
            <View style={styles.row}>
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
                    style={[styles.chip, on && styles.chipOn]}>
                    <ClayIcon name={s as ClayIconName} size={30} tile={false} />
                  </PressableScale>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Txt variant="h3">{t('frames.caption')}</Txt>
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder={t('frames.captionPlaceholder')}
              placeholderTextColor={colors.textFaint}
              accessibilityLabel={t('frames.caption')}
              maxLength={FRAME_CAPTION_MAX}
              style={styles.input}
            />
          </View>

          <View style={styles.section}>
            <Txt variant="h3">{t('frames.name')}</Txt>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t('frames.namePlaceholder')}
              placeholderTextColor={colors.textFaint}
              accessibilityLabel={t('frames.name')}
              maxLength={FRAME_NAME_MAX}
              style={styles.input}
            />
          </View>
        </ScrollView>

        {/* Action bar (docs/design-style.md §3). */}
        <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
          <Button label={t('frames.save')} size="lg" full onPress={save} />
          <Txt variant="caption" color={colors.textSecondary} center>
            {t('frames.saveHint')}
          </Txt>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { paddingHorizontal: space.lg, paddingTop: space.xs, paddingBottom: space.xxl, gap: space.xl },
  preview: {
    height: 236,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tilt: { transform: [{ rotate: '-2deg' }] },
  section: { gap: space.sm + 2 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  swatchRing: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: 'transparent', padding: 3 },
  swatchOn: { borderColor: colors.text },
  swatch: { flex: 1, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  chip: {
    minWidth: 48,
    height: 48,
    paddingHorizontal: space.md,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.surface, borderColor: colors.text },
  input: {
    minHeight: 52,
    paddingHorizontal: space.md + 2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    ...type.body,
  },
  actionBar: {
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
