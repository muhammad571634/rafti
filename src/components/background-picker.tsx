import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Picture } from '@/components/chat/chat-ground';
import { SoftSegmented, TitleTop } from '@/components/character/kit';
import { glassStyle, PressableScale, Screen, Txt } from '@/components/ui';
import { backgroundsById, chatArtBackgrounds, chatArtBackgroundsById, chatBackgrounds, CREAM_BG, PORTRAIT_BG } from '@/mock';
import { colors, fonts, gradients, gradientStops, playful, space } from '@/theme';

type BackgroundCollection = 'classic' | 'art';
type BackgroundOption = (typeof chatBackgrounds)[number] | (typeof chatArtBackgrounds)[number];

const COLUMNS = 3;
const GAP = 10;

/**
 * The chat background in the four tabs' look (0z153): a heavy title by a round back button, a
 * preview with the chat's own bubbles and glass field, a soft segmented switch, then tiles.
 * A tap picks the background (`onPick`); one-to-one chats and group chats both use it. A one-to-one
 * chat passes the character's `portrait`, its default: it sits on its own row above Classic and Art
 * (owner, 2026-11-03: their picture is not one of the wallpapers), the way back after trying one.
 */
export function BackgroundPicker({
  savedId,
  onPick,
  portrait,
  name = '',
}: {
  savedId?: string;
  onPick: (backgroundId: string) => void;
  portrait?: Picture;
  /** Theirs, under the portrait row's title. */
  name?: string;
}) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const router = useRouter();

  // Cream is every chat's ground (owner, 2026-11-08); their picture is a row of its own to pick.
  const fallback = CREAM_BG;
  const known = (id: string) => (id === PORTRAIT_BG ? !!portrait : !!(backgroundsById[id] || chatArtBackgroundsById[id]));
  const savedBackgroundId = savedId ?? fallback;
  const backgroundId = known(savedBackgroundId) ? savedBackgroundId : fallback;
  const onPortrait = backgroundId === PORTRAIT_BG ? portrait : undefined;
  const [collection, setCollection] = useState<BackgroundCollection>(() =>
    chatArtBackgroundsById[backgroundId] ? 'art' : 'classic',
  );
  const tileWidth = (width - space.lg * 2 - GAP * (COLUMNS - 1)) / COLUMNS;
  const previewHeight = Math.min(200, Math.max(156, width * 0.45));
  const selectedArt = chatArtBackgroundsById[backgroundId];
  const selectedClassic = backgroundsById[backgroundId] ?? backgroundsById[CREAM_BG];
  const data: BackgroundOption[] = collection === 'art' ? [...chatArtBackgrounds] : chatBackgrounds;
  const tabs: { value: BackgroundCollection; label: string }[] = [
    { value: 'classic', label: t('background.collections.classic') },
    { value: 'art', label: t('background.collections.art') },
  ];

  return (
    <Screen background={playful.ground}>
      <TitleTop title={t('background.title')} onBack={() => router.back()} />
      <FlatList
        key={collection}
        data={data}
        numColumns={COLUMNS}
        keyExtractor={(background) => background.id}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + space.huge }]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={COLUMNS * 3}
        // The preview and the Classic / Art switch scroll away with the tiles.
        ListHeaderComponent={
          <View style={styles.head}>
            <View style={[styles.preview, { height: previewHeight }]} accessibilityLabel={t('background.preview')}>
              {onPortrait ? (
                <>
                  <Image source={onPortrait.source} contentFit="cover" contentPosition={onPortrait.position} style={StyleSheet.absoluteFill} />
                  <LinearGradient colors={gradients.pictureScrim} locations={gradientStops.pictureScrim} style={StyleSheet.absoluteFill} />
                </>
              ) : selectedArt ? (
                <>
                  <Image source={selectedArt.image} contentFit="cover" style={StyleSheet.absoluteFill} />
                  {/* As the chat draws a picture: shaded, dark glass bubbles and field (`chat-ground.tsx`). */}
                  <LinearGradient colors={gradients.pictureScrim} locations={gradientStops.pictureScrim} style={StyleSheet.absoluteFill} />
                </>
              ) : (
                <LinearGradient colors={selectedClassic.colors} style={StyleSheet.absoluteFill} />
              )}
              {/* Every chat is dark now (appearance B): the bubbles and field on any ground take the picture look. */}
              <View pointerEvents="none" style={[styles.previewBubble, styles.previewTheirs, styles.previewTheirsOnPicture]} />
              <View pointerEvents="none" style={[styles.previewBubble, styles.previewMine]} />
              <View pointerEvents="none" style={[glassStyle, styles.previewField, styles.previewFieldOnPicture]} />
            </View>

            {portrait ? (
              // Their own picture, the default: a row of its own, not a wallpaper tile.
              <PressableScale
                scaleTo={0.98}
                onPress={() => onPick(PORTRAIT_BG)}
                accessibilityRole="button"
                accessibilityLabel={[t('background.portrait'), name].filter(Boolean).join(', ')}
                accessibilityState={{ selected: !!onPortrait }}
                style={[styles.portraitRow, onPortrait && styles.portraitRowOn]}>
                <Image source={portrait.source} contentFit="cover" contentPosition={portrait.position} style={styles.portraitThumb} />
                <View style={styles.portraitCopy}>
                  <Txt style={styles.portraitTitle} lines={1}>
                    {t('background.portrait')}
                  </Txt>
                  {name ? (
                    <Txt style={styles.portraitName} lines={1}>
                      {name}
                    </Txt>
                  ) : null}
                </View>
                {onPortrait ? (
                  <View style={styles.portraitCheck}>
                    <Ionicons name="checkmark" size={15} color={colors.textOnPrimary} />
                  </View>
                ) : null}
              </PressableScale>
            ) : null}

            <View style={styles.segment}>
              <SoftSegmented options={tabs} value={collection} onChange={setCollection} />
            </View>
          </View>
        }
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
              onPress={() => onPick(item.id)}>
              <View style={[styles.tile, { height: tileWidth * 1.4 }]}>
                {art ? (
                  <Image source={item.image} contentFit="cover" style={StyleSheet.absoluteFill} />
                ) : (
                  <LinearGradient colors={item.colors} style={StyleSheet.absoluteFill} />
                )}
                <View pointerEvents="none" style={[styles.tileBorder, selected && styles.tileBorderSelected]} />
                {selected ? (
                  <View style={styles.check}>
                    <Ionicons name="checkmark" size={15} color={colors.textOnPrimary} />
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
    marginTop: space.xs,
    marginHorizontal: space.lg,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: playful.chip,
    // The cream wallpaper on the cream ground: a soft rim keeps the preview a card.
    borderWidth: 1.5,
    borderColor: playful.dash,
  },
  // The chat's own bubble colours and tails, so the preview reads like the chat.
  previewBubble: { position: 'absolute', height: 34, borderRadius: 17 },
  previewTheirs: { left: space.md, top: 22, width: '58%', backgroundColor: colors.bubbleOther, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bubbleOtherRim, borderBottomLeftRadius: 5 },
  previewMine: { right: space.md, top: 64, width: '46%', backgroundColor: colors.bubbleSelf, borderBottomRightRadius: 5 },
  previewField: { position: 'absolute', left: space.md, right: space.md, bottom: space.md, height: 32, borderRadius: 16 },
  previewTheirsOnPicture: { backgroundColor: colors.onMediaBubble, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.onMediaHairline },
  previewFieldOnPicture: { backgroundColor: colors.onMediaField, borderColor: colors.onMediaHairline },
  // Their picture's own row (a Settings-style select row): thumbnail, title, name, the check when chosen.
  portraitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginTop: space.lg,
    marginHorizontal: space.lg,
    padding: 10,
    paddingRight: space.lg,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: playful.card,
  },
  portraitRowOn: { borderColor: colors.primary },
  portraitThumb: { width: 46, height: 60, borderRadius: 14, backgroundColor: playful.chip },
  portraitCopy: { flex: 1, gap: 2 },
  portraitTitle: { fontFamily: fonts.playful, fontSize: 18, lineHeight: 23, color: playful.ink },
  portraitName: { fontSize: 13, color: colors.textSecondary },
  portraitCheck: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  segment: { marginTop: space.lg, marginHorizontal: space.lg },
  scroll: { paddingHorizontal: space.lg },
  // The header spans the screen; the list's gutter is pulled back for it.
  head: { marginHorizontal: -space.lg, marginBottom: space.lg },
  row: { gap: GAP, marginBottom: space.md },
  tile: { borderRadius: 18, overflow: 'hidden', backgroundColor: playful.chip },
  tileBorder: {
    ...StyleSheet.absoluteFill,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  tileBorderSelected: { borderWidth: 3, borderColor: colors.primary },
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
  tileName: { marginTop: 6, fontFamily: fonts.playfulBold, fontSize: 12.5, color: colors.textSecondary },
});
