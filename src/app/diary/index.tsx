import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, IconButton, PressableScale, Screen, Sheet, Txt } from '@/components/ui';
import { dateFromKey } from '@/mock';
import { useAppStore } from '@/store/use-app-store';
import { avatarGradients, colors, palette, radius, space } from '@/theme';
import type { Character } from '@/types';

type CardItem =
  | { id: 'my-diary'; type: 'my' }
  | { id: string; type: 'character'; character: Character };

export default function HeartbeatDiaryScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);
  const diary = useAppStore((s) => s.diary);

  const [activeIndex, setActiveIndex] = useState(0);
  const [infoOpen, setInfoOpen] = useState(false);

  // Active characters that user has a relationship with
  const activeCharacters = useMemo(
    () => characters.filter((c) => relationships[c.id]),
    [characters, relationships]
  );

  const items: CardItem[] = useMemo(() => {
    return [
      { id: 'my-diary', type: 'my' },
      ...activeCharacters.map((c) => ({ id: c.id, type: 'character' as const, character: c })),
    ];
  }, [activeCharacters]);

  const cardWidth = Math.min(270, width * 0.7);
  const sideSpace = (width - cardWidth) / 2;
  const itemFullWidth = cardWidth; // No gap since we overlap them via transform/perspective in cover flow

  const scrollX = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    },
  });

  const activeItem = items[activeIndex];

  // Dynamic Background Blur Color
  const itemColors = useMemo(() => {
    return items.map(item => {
      if (item.type === 'my') return palette.sky200; 
      const tint = avatarGradients[item.character.accentIndex % avatarGradients.length][0];
      return tint; 
    });
  }, [items]);

  const backgroundAnimatedStyle = useAnimatedStyle(() => {
    const inputRange = items.map((_, i) => i * itemFullWidth);
    if (inputRange.length === 0) return { backgroundColor: 'transparent' };
    if (inputRange.length === 1) return { backgroundColor: itemColors[0] };
    
    const backgroundColor = interpolateColor(scrollX.value, inputRange, itemColors);
    return { backgroundColor };
  });

  const handleWriteToday = () => {
    if (activeItem?.type === 'my') {
      router.push('/diary/write');
    } else if (activeItem?.type === 'character') {
      router.push({ pathname: '/diary/write', params: { characterId: activeItem.character.id } });
    }
  };

  const todayStr = dateFromKey(new Date().toISOString().split('T')[0] || '').toLocaleDateString(i18n.language, {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });

  return (
    <View style={styles.container}>
      {/* Ambient background matching active card */}
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[styles.ambientBg, backgroundAnimatedStyle]} />
        <View style={styles.blurOverlay} />
      </View>

      <Screen background="transparent">
        {/* Header */}
        <View style={styles.header}>
          <IconButton icon="chevron-back" size={24} onPress={() => router.back()} />
          <Txt variant="h3" style={styles.title}>{t('diary.title', 'Heartbeat Diary')}</Txt>
          <IconButton
            icon="information-circle-outline"
            size={24}
            onPress={() => setInfoOpen(true)}
            accessibilityLabel={t('a11y.about')}
          />
        </View>

        {/* Date Pill */}
        <View style={styles.dateWrap}>
          <View style={styles.datePill}>
            <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
            <Txt variant="smallStrong" color={colors.text}>
              {todayStr}
            </Txt>
            <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
          </View>
        </View>

        {/* Carousel Cover Flow */}
        <View style={styles.carouselWrap}>
          <Animated.ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={itemFullWidth}
            decelerationRate="fast"
            contentContainerStyle={{
              paddingHorizontal: sideSpace,
              alignItems: 'center',
            }}
            onScroll={onScroll}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / itemFullWidth);
              setActiveIndex(Math.max(0, Math.min(idx, items.length - 1)));
            }}
          >
            {items.map((item, index) => {
              const inputRange = [
                (index - 1) * itemFullWidth,
                index * itemFullWidth,
                (index + 1) * itemFullWidth,
              ];
              
              const animatedCardStyle = useAnimatedStyle(() => {
                const scale = interpolate(scrollX.value, inputRange, [0.85, 1, 0.85], Extrapolation.CLAMP);
                const rotateZ = interpolate(scrollX.value, inputRange, [-12, 0, 12], Extrapolation.CLAMP);
                const opacity = interpolate(scrollX.value, inputRange, [0.7, 1, 0.7], Extrapolation.CLAMP);
                const zIndex = interpolate(scrollX.value, inputRange, [1, 10, 1], Extrapolation.CLAMP);
                // Fake origin-bottom effect by translating down when scaled down
                const translateY = interpolate(scrollX.value, inputRange, [20, 0, 20], Extrapolation.CLAMP);

                return {
                  opacity,
                  zIndex,
                  transform: [
                    { translateY },
                    { scale },
                    { rotateZ: `${rotateZ}deg` },
                  ],
                };
              });

              if (item.type === 'my') {
                const myPages = diary.filter(d => !d.sharedWithCharacterId).length;
                return (
                  <Animated.View key={item.id} style={[styles.cardContainer, { width: cardWidth }, animatedCardStyle]}>
                     <View style={styles.card}>
                        <View style={[styles.coverWrap, { backgroundColor: palette.cream50 }]}>
                           <Image source={require('@/../assets/brand/tile-diary.png')} style={styles.coverImageMy} contentFit="contain" />
                        </View>
                        <View style={styles.cardInfo}>
                           <Txt variant="h2" style={styles.cardTitle}>{t('diary.myDiary', 'My diary')}</Txt>
                           <Txt variant="smallStrong" color={colors.textSecondary}>{t('diary.pagesCount', { count: myPages, defaultValue: `${myPages} pages` })}</Txt>
                        </View>
                     </View>
                  </Animated.View>
                );
              }

              const c = item.character!;
              const pages = diary.filter(d => d.sharedWithCharacterId === c.id).length;
              // Check if there is a new page today logically (simplified to true for mockup visual match)
              const hasNewPage = true;

              return (
                <Animated.View key={item.id} style={[styles.cardContainer, { width: cardWidth }, animatedCardStyle]}>
                   <View style={styles.card}>
                      <View style={[styles.coverWrap, { backgroundColor: palette.cream100 }]}>
                         <Image source={{ uri: `asset:/heroes/c_${c.id}.jpg` }} style={StyleSheet.absoluteFill} contentFit="cover" />
                      </View>
                      <View style={styles.cardInfo}>
                         <Txt variant="h2" style={styles.cardTitle}>{c.name}'s diary</Txt>
                         {hasNewPage ? (
                            <View style={styles.badge}>
                               <View style={styles.badgeDot} />
                               <Txt variant="tiny" style={styles.badgeText}>New page today</Txt>
                            </View>
                         ) : (
                            <Txt variant="smallStrong" color={colors.textSecondary}>{pages} pages</Txt>
                         )}
                      </View>
                   </View>
                </Animated.View>
              );
            })}
          </Animated.ScrollView>
        </View>

        {/* Footer Full Width Button */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + space.md, space.lg) }]}>
          <Button
            label={t('diary.writeToday', "Write today's page")}
            size="lg"
            full
            left={<Ionicons name="pencil-outline" size={20} color={colors.textOnPrimary} />}
            onPress={handleWriteToday}
            style={styles.mainButton}
          />
        </View>

        {/* Info Sheet (Bottom Sheet exactly like mockup) */}
        <Sheet visible={infoOpen} onClose={() => setInfoOpen(false)}>
           <View style={styles.sheetContent}>
              <View style={styles.sheetIconWrap}>
                 <Image source={require('@/../assets/brand/tile-diary.png')} style={styles.sheetIcon} contentFit="contain" />
              </View>
              <Txt variant="h2" style={styles.sheetTitle}>{t('diary.howItWorksTitle', 'How their diary works')}</Txt>
              <Txt variant="body" color={colors.textSecondary} style={styles.sheetText}>
                 {t('diary.howItWorksBody', 'Chat with them or go on a date today, and tomorrow morning they write a page about how it felt.')}
              </Txt>
              <Button 
                label={t('common.gotIt', 'Got it')}
                size="lg"
                full
                onPress={() => setInfoOpen(false)}
                style={styles.sheetButton}
              />
           </View>
        </Sheet>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPlain,
  },
  ambientBg: {
    ...StyleSheet.absoluteFill,
    opacity: 0.35,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(248, 245, 242, 0.75)', 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: space.xl,
    paddingBottom: space.sm,
  },
  title: {
    textAlign: 'center',
  },
  dateWrap: {
    alignItems: 'center',
    marginBottom: space.lg,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    gap: space.xs,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  carouselWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  cardContainer: {
    height: 400, // Fixed height to handle the rotation scaling without clipping
    justifyContent: 'center',
  },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
    overflow: 'hidden',
    marginHorizontal: 10,
  },
  coverWrap: {
    flex: 6, // About 60% of the card is the image
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  coverImageMy: {
    width: '80%',
    height: '80%',
    opacity: 0.8,
  },
  cardInfo: {
    flex: 4, 
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  cardTitle: {
    marginBottom: space.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F7F5',
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: space.xs,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2A9E88',
  },
  badgeText: {
    color: '#2A9E88',
  },
  footer: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
  },
  mainButton: {
    backgroundColor: '#E67A2A', 
    shadowColor: '#E67A2A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  sheetContent: {
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingBottom: space.xl,
  },
  sheetIconWrap: {
    width: 140,
    height: 100,
    marginBottom: space.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetIcon: {
    width: '100%',
    height: '100%',
  },
  sheetTitle: {
    textAlign: 'center',
    marginBottom: space.md,
  },
  sheetText: {
    textAlign: 'center',
    marginBottom: space.xxl,
    lineHeight: 22,
    paddingHorizontal: space.sm,
  },
  sheetButton: {
    backgroundColor: '#E67A2A',
  },
});
