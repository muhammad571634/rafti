import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Header, PressableScale, Screen, Segmented } from '@/components/ui';
import { backgroundsById, chatArtBackgrounds, chatArtBackgroundsById, chatBackgrounds } from '@/mock';
import { useAppStore } from '@/store/use-app-store';
import { colors, radius, space } from '@/theme';

type BackgroundCollection = 'classic' | 'art';
type BackgroundOption = (typeof chatBackgrounds)[number] | (typeof chatArtBackgrounds)[number];

export default function ChangeBackgroundScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const characterId = Array.isArray(id) ? id[0] : id;

  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const relationship = useAppStore((s) => (characterId ? s.relationships[characterId] : undefined));
  const setBackground = useAppStore((s) => s.setBackground);

  const savedBackgroundId = relationship?.backgroundId ?? 'bg_blossom';
  const backgroundId =
    backgroundsById[savedBackgroundId] || chatArtBackgroundsById[savedBackgroundId]
      ? savedBackgroundId
      : 'bg_blossom';
  const [collection, setCollection] = useState<BackgroundCollection>(() =>
    chatArtBackgroundsById[backgroundId] ? 'art' : 'classic',
  );
  const artCollection = collection === 'art';
  const columns = artCollection ? 3 : 2;
  const gap = artCollection ? space.sm : space.md;
  const tileWidth = (width - space.lg * 2 - gap * (columns - 1)) / columns;
  const previewHeight = Math.min(200, Math.max(156, width * 0.5));
  const selectedArt = chatArtBackgroundsById[backgroundId];
  const selectedClassic = backgroundsById[backgroundId] ?? backgroundsById.bg_blossom;
  const data: BackgroundOption[] = artCollection ? [...chatArtBackgrounds] : chatBackgrounds;
  const tabs = [
    { value: 'classic', label: t('background.collections.classic') },
    { value: 'art', label: t('background.collections.art') },
  ] as const;

  return (
    <Screen background={colors.bgPlain}>
      <Header title={t('background.title')} />
      <View style={[styles.preview, { height: previewHeight }]} accessibilityLabel={t('background.preview')}>
        {selectedArt ? (
          <Image source={selectedArt.image} contentFit="cover" style={StyleSheet.absoluteFill} />
        ) : (
          <LinearGradient colors={selectedClassic.colors} style={StyleSheet.absoluteFill} />
        )}
        <View pointerEvents="none" style={styles.previewVeil} />
        <View pointerEvents="none" style={styles.previewMessages}>
          <View style={[styles.previewBubble, styles.previewBubbleIncoming]}>
            <View style={[styles.previewLine, styles.previewLineLong]} />
            <View style={[styles.previewLine, styles.previewLineShort]} />
          </View>
          <View style={[styles.previewBubble, styles.previewBubbleOutgoing]}>
            <View style={[styles.previewLine, styles.previewLineLong]} />
            <View style={[styles.previewLine, styles.previewLineShort]} />
          </View>
        </View>
        <View pointerEvents="none" style={styles.previewComposer} />
      </View>
      <Segmented options={tabs} value={collection} onChange={setCollection} style={styles.tabs} />

      <FlatList
        key={collection}
        data={data}
        numColumns={columns}
        keyExtractor={(background) => background.id}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        initialNumToRender={columns * 3}
        renderItem={({ item }) => {
          const art = 'image' in item;
          const selected = backgroundId === item.id;
          const accessibilityLabel = art
            ? t(`background.artItems.${item.nameKey}`)
            : t(`background.${item.nameKey}`);

          return (
            <PressableScale
              style={{ width: tileWidth, marginBottom: gap }}
              scaleTo={0.97}
              accessibilityRole="button"
              accessibilityLabel={accessibilityLabel}
              accessibilityState={{ selected }}
              onPress={() => {
                if (characterId) setBackground(characterId, item.id);
                router.back();
              }}>
              <View style={[styles.tile, { height: tileWidth * (artCollection ? 1.22 : 1.5) }]}>
                {art ? (
                  <Image source={item.image} contentFit="cover" style={StyleSheet.absoluteFill} />
                ) : (
                  <LinearGradient colors={item.colors} style={StyleSheet.absoluteFill} />
                )}
                {selected ? (
                  <View style={styles.check}>
                    <Ionicons name="checkmark" size={15} color={colors.textOnPrimary} />
                  </View>
                ) : null}
                <View
                  pointerEvents="none"
                  style={[styles.tileBorder, selected && styles.tileBorderSelected]}
                />
              </View>
            </PressableScale>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: {
    marginHorizontal: space.lg,
    marginBottom: space.md,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  previewVeil: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,250,241,0.16)',
  },
  previewMessages: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    padding: space.sm,
    gap: space.xs,
    bottom: 38,
  },
  previewBubble: {
    height: 36,
    borderRadius: radius.md,
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: space.sm,
  },
  previewBubbleIncoming: { width: '58%', alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.96)' },
  previewBubbleOutgoing: { width: '52%', alignSelf: 'flex-end', backgroundColor: 'rgba(255,226,198,0.96)' },
  previewLine: { height: 4, borderRadius: radius.pill, backgroundColor: 'rgba(42,46,69,0.18)' },
  previewLineLong: { width: '78%' },
  previewLineShort: { width: '52%' },
  previewComposer: {
    position: 'absolute',
    left: space.sm,
    right: space.sm,
    bottom: space.sm,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
  tabs: { marginHorizontal: space.lg, marginBottom: space.sm },
  scroll: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.huge },
  row: { justifyContent: 'space-between' },
  tile: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  tileBorder: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileBorderSelected: { borderWidth: 2, borderColor: colors.text },
  check: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: space.sm,
    right: space.sm,
  },
});
