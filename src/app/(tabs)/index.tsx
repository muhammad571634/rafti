import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { BRAND, TILES } from '@/assets/brand/registry';
import { Mascot, PressableScale, Screen, Txt, UserAvatar } from '@/components/ui';
import { FREE_SPINS_PER_DAY, homeModules, todayKey } from '@/mock';
import { useAppStore } from '@/store/use-app-store';
import { colors, gradients, radius, shadows, space, TAB_BAR_HEIGHT } from '@/theme';
import type { HomeModule } from '@/types';

const COLUMNS = 4;

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const user = useAppStore((s) => s.user);
  const friends = useAppStore((s) => s.conversations.length);
  const spinReady = useAppStore(
    (s) => s.daily.spinDay !== todayKey() || s.daily.spinsUsed < FREE_SPINS_PER_DAY,
  );

  const gutter = space.lg;
  const gap = space.md;
  const tileSize = (Math.min(width, 520) - gutter * 2 - gap * (COLUMNS - 1)) / COLUMNS;

  return (
    <Screen background={gradients.home}>
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <Txt variant="logo" color={colors.brandText}>
            {t('app.name')}
          </Txt>
          <Mascot size={26} bob />
        </View>

        <PressableScale
          style={styles.userPill}
          scaleTo={0.94}
          hitSlop={6}
          onPress={() => router.push('/profile')}>
          <UserAvatar user={user} size={24} />
          <Txt variant="smallStrong" color={colors.textSecondary} lines={1}>
            {user.displayName}
          </Txt>
        </PressableScale>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: TAB_BAR_HEIGHT + space.xxl }]}>
        <Banner
          hasFriends={friends > 0}
          onPress={() => router.push(friends > 0 ? '/(tabs)/chat' : '/(tabs)/find')}
        />

        <View style={[styles.grid, { gap }]}>
          {homeModules.map((module) => (
            <ModuleTile
              key={module.key}
              module={module}
              size={tileSize}
              dot={module.key === 'gifts' && spinReady}
              label={t(`home.modules.${module.labelKey}`)}
              onPress={() => router.push(module.route as never)}
            />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

function Banner({ hasFriends, onPress }: { hasFriends: boolean; onPress: () => void }) {
  const { t } = useTranslation();

  return (
    <PressableScale onPress={onPress} scaleTo={0.985} style={[styles.bannerWrap, shadows.card]}>
      {/* Rafti stands on the right of the art; the left stays clear for the bubble. */}
      <Image source={BRAND.banner} style={styles.banner} contentFit="cover" contentPosition="right" />
      <View style={styles.bubble}>
        <Txt variant="smallStrong" color={colors.primary}>
          {hasFriends ? t('home.greetingBannerWithFriends') : t('home.greetingBanner')}
        </Txt>
        <View style={styles.bubbleTail} />
      </View>
    </PressableScale>
  );
}

function ModuleTile({
  module,
  size,
  label,
  dot,
  onPress,
}: {
  module: HomeModule;
  size: number;
  label: string;
  dot?: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale style={{ width: size }} onPress={onPress} scaleTo={0.93}>
      <View style={[styles.tile, { width: size, height: size }, shadows.card]}>
        <Image source={TILES[module.tile]} style={styles.tileArt} contentFit="cover" />
        {dot ? <View style={styles.dot} /> : null}
      </View>
      <Txt variant="tile" center lines={2} style={styles.tileLabel}>
        {label}
      </Txt>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.md,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  userPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingLeft: 3,
    paddingRight: space.md,
    height: 32,
    maxWidth: 150,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primarySoft,
  },
  scroll: { paddingHorizontal: space.lg },
  bannerWrap: { marginBottom: space.xl, borderRadius: radius.xxl },
  banner: {
    height: 156,
    borderRadius: radius.xxl,
  },
  bubble: {
    position: 'absolute',
    top: space.lg,
    left: space.lg,
    maxWidth: '58%',
    backgroundColor: colors.surface,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.lg,
    zIndex: 2,
  },
  bubbleTail: {
    position: 'absolute',
    bottom: -5,
    right: 22,
    width: 12,
    height: 12,
    backgroundColor: colors.surface,
    transform: [{ rotate: '45deg' }],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  // The tile colour and its rounded corners are part of the art.
  tile: { borderRadius: radius.tile },
  tileArt: { width: '100%', height: '100%' },
  dot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  tileLabel: { marginTop: space.xs, minHeight: 26 },
});
