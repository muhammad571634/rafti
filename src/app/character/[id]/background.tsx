import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassBar, glassStyle, LargeTitle, PressableScale, Screen, Txt } from '@/components/ui';
import { backgroundsById, chatArtBackgrounds, chatArtBackgroundsById, chatBackgrounds } from '@/mock';
import { useAppStore } from '@/store/use-app-store';
import { colors, space } from '@/theme';

type BackgroundCollection = 'classic' | 'art';
type BackgroundOption = (typeof chatBackgrounds)[number] | (typeof chatArtBackgrounds)[number];

const COLUMNS = 3;
const GAP = 10;

/**
 * The chat background, iOS style (approved prototype `Background.dc.html`): a large title, a
 * preview with the chat's own bubbles and glass field, an iOS segmented control, then tiles.
 * A tap picks the background and goes back to the chat.
 */
export default function ChangeBackgroundScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const characterId = Array.isArray(id) ? id[0] : id;

  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const relationship = useAppStore((s) => (characterId ? s.relationships[characterId] : undefined));
  const setBackground = useAppStore((s) => s.setBackground);
  const conversation = useAppStore((s) => s.conversations.find((c) => c.characterId === characterId));

  const savedBackgroundId = relationship?.backgroundId ?? 'bg_plain';
  const backgroundId =
    backgroundsById[savedBackgroundId] || chatArtBackgroundsById[savedBackgroundId]
      ? savedBackgroundId
      : 'bg_plain';
  const [collection, setCollection] = useState<BackgroundCollection>(() =>
    chatArtBackgroundsById[backgroundId] ? 'art' : 'classic',
  );
  const tileWidth = (width - space.lg * 2 - GAP * (COLUMNS - 1)) / COLUMNS;
  const previewHeight = Math.min(200, Math.max(156, width * 0.45));
  const selectedArt = chatArtBackgroundsById[backgroundId];
  const selectedClassic = backgroundsById[backgroundId] ?? backgroundsById.bg_plain;
  const data: BackgroundOption[] = collection === 'art' ? [...chatArtBackgrounds] : chatBackgrounds;
  const tabs: { value: BackgroundCollection; label: string }[] = [
    { value: 'classic', label: t('background.collections.classic') },
    { value: 'art', label: t('background.collections.art') },
  ];

  return (
    <Screen background={colors.bg}>
      <GlassBar />
      <LargeTitle>{t('background.title')}</LargeTitle>

      <View style={[styles.preview, { height: previewHeight }]} accessibilityLabel={t('background.preview')}>
        {selectedArt ? (
          <Image source={selectedArt.image} contentFit="cover" style={StyleSheet.absoluteFill} />
        ) : (
          <LinearGradient colors={selectedClassic.colors} style={StyleSheet.absoluteFill} />
        )}
        <View pointerEvents="none" style={[styles.previewBubble, styles.previewTheirs]} />
        <View pointerEvents="none" style={[styles.previewBubble, styles.previewMine]} />
        <View pointerEvents="none" style={[glassStyle, styles.previewField]} />
      </View>

      {/* iOS segmented control: a grey track, the chosen side as a raised white pill. */}
      <View style={styles.segment} accessibilityRole="tablist">
        {tabs.map((tab) => {
          const on = collection === tab.value;
          return (
            <Pressable
              key={tab.value}
              onPress={() => setCollection(tab.value)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={[styles.segmentItem, on && styles.segmentOn]}>
              <Txt style={[styles.segmentText, on && styles.segmentTextOn]}>{tab.label}</Txt>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        key={collection}
        data={data}
        numColumns={COLUMNS}
        keyExtractor={(background) => background.id}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + space.huge }]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={COLUMNS * 3}
        renderItem={({ item }) => {
          const art = 'image' in item;
          const selected = backgroundId === item.id;
          const label = art ? t(`background.artItems.${item.nameKey}`) : t(`background.${item.nameKey}`);

          return (
            <PressableScale
              style={{ width: tileWidth }}
              scaleTo={0.97}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected }}
              onPress={() => {
                if (characterId) setBackground(characterId, item.id);
                // Straight back to the chat to see it there (not one step, to the settings).
                if (conversation) router.dismissTo(`/chat/${conversation.id}`);
                else router.back();
              }}>
              <View style={[styles.tile, { height: tileWidth * 1.4 }]}>
                {art ? (
                  <Image source={item.image} contentFit="cover" style={StyleSheet.absoluteFill} />
                ) : (
                  <LinearGradient colors={item.colors} style={StyleSheet.absoluteFill} />
                )}
                <View pointerEvents="none" style={[styles.tileBorder, selected && styles.tileBorderSelected]} />
                {selected ? (
                  <View style={styles.check}>
                    <Ionicons name="checkmark" size={14} color={colors.white} />
                  </View>
                ) : null}
              </View>
              <Txt style={styles.tileName} center lines={1}>
                {label}
              </Txt>
            </PressableScale>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: {
    marginTop: 14,
    marginHorizontal: space.lg,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  // The chat's own bubble colours and tails, so the preview reads like the chat.
  previewBubble: { position: 'absolute', height: 34, borderRadius: 17 },
  previewTheirs: { left: space.md, top: 22, width: '58%', backgroundColor: colors.bubbleOther, borderBottomLeftRadius: 5 },
  previewMine: { right: space.md, top: 64, width: '46%', backgroundColor: colors.bubbleSelf, borderBottomRightRadius: 5 },
  previewField: { position: 'absolute', left: space.md, right: space.md, bottom: space.md, height: 32, borderRadius: 16 },
  segment: {
    flexDirection: 'row',
    height: 36,
    marginTop: space.lg,
    marginHorizontal: space.lg,
    padding: 2,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
  },
  segmentItem: { flex: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  segmentOn: { backgroundColor: colors.surface, ...glassStyle, borderWidth: 0 },
  segmentText: { fontSize: 15, fontWeight: '500', color: colors.text },
  segmentTextOn: { fontWeight: '600' },
  scroll: { paddingHorizontal: space.lg, paddingTop: space.lg },
  row: { gap: GAP, marginBottom: space.md },
  tile: { borderRadius: 16, overflow: 'hidden', backgroundColor: colors.surfaceAlt },
  tileBorder: {
    ...StyleSheet.absoluteFill,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  tileBorderSelected: { borderWidth: 2.5, borderColor: colors.primary },
  check: {
    position: 'absolute',
    right: space.sm,
    bottom: space.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileName: { marginTop: 6, fontSize: 12, color: colors.textSecondary },
});
