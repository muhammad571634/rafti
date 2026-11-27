import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Anim, CharacterAvatar, PressableScale, Screen, Txt, characterImage } from '@/components/ui';
import { ElasticSlide } from '@/components/ui/elastic-slide';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, gradients, space, systemColors } from '@/theme';
import { ink, inkRadius } from '@/theme/ink';

/** Stop ringing after this long and log it as missed, like a real phone. */
const RING_TIMEOUT_MS = 30_000;

/**
 * "Get phone call from your bias": the character calls you. Full-bleed portrait,
 * contact poster header, pulsing rings, and an Elastic Liquid Glass slide-to-answer capsule
 * with a clean glass Decline pill below.
 */
export default function IncomingCallScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const characterId = Array.isArray(id) ? id[0] : id;

  const { t } = useTranslation();
  const router = useRouter();

  const character = useAppStore((s) => s.characters.find((c) => c.id === characterId));
  const relationship = useAppStore((s) => (characterId ? s.relationships[characterId] : undefined));
  const slot = useAppStore((s) => s.incomingCall?.slot);
  const ringing = useAppStore((s) => s.incomingCall?.characterId === characterId);
  const acceptCall = useAppStore((s) => s.acceptCall);
  const declineCall = useAppStore((s) => s.declineCall);

  const slideProgress = useSharedValue(0);
  const answerGlowStyle = useAnimatedStyle(() => ({
    opacity: 0.06 + slideProgress.value * 0.46,
  }));

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const decline = () => {
    declineCall();
    close();
  };

  const accept = () => {
    acceptCall();
    router.replace(`/call/${characterId}?incoming=1`);
  };

  useEffect(() => {
    if (!ringing) return;
    const timeout = setTimeout(() => {
      useAppStore.getState().declineCall();
      if (router.canGoBack()) router.back();
      else router.replace('/');
    }, RING_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [ringing, router]);

  if (!character) {
    return (
      <Screen>
        <Txt style={styles.missing}>{t('errors.notFound')}</Txt>
      </Screen>
    );
  }

  const image = characterImage(character);

  return (
    <Screen
      background={gradients.call}
      statusBarStyle="light"
      backdrop={
        <View style={StyleSheet.absoluteFill}>
          {image != null ? (
            <Image
              source={typeof image === 'string' ? { uri: image } : image}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              blurRadius={6}
            />
          ) : null}
          <LinearGradient
            colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.08)', 'rgba(0,0,0,0.08)', 'rgba(0,0,0,0.62)']}
            locations={[0, 0.34, 0.58, 1]}
            style={StyleSheet.absoluteFill}
          />
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, answerGlowStyle]}>
            <LinearGradient
              colors={[`${systemColors.green}00`, `${systemColors.green}38`, `${systemColors.green}94`]}
              locations={[0.25, 0.65, 1]}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
      }>
      <View style={styles.top}>
        <Txt style={styles.slot} center>
          {slot ? t(`call.${slot}`) : t('call.calling')}
        </Txt>
        <Txt style={styles.name} center lines={2}>
          {displayName(character, relationship)}
        </Txt>
      </View>

      <View style={styles.center}>
        <Anim name="calling" size={250} tint="rgba(255,255,255,0.65)" style={styles.rings} />
        <CharacterAvatar character={character} size={150} ring ringColor="rgba(255,255,255,0.9)" />
      </View>

      <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom + space.xl, space.huge) }]}>
        <ElasticSlide
          variant="call"
          label={t('call.slideToAnswer')}
          onComplete={accept}
          progressOut={slideProgress}
        />
        <PressableScale
          onPress={decline}
          scaleTo={0.96}
          haptic
          accessibilityRole="button"
          accessibilityLabel={t('call.decline')}
          style={styles.declinePill}>
          <MaterialCommunityIcons name="phone-hangup" size={20} color={systemColors.red} />
          <Txt style={styles.declineLabel}>{t('call.decline')}</Txt>
        </PressableScale>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  missing: { padding: space.xl },
  // Name centred up top, the way an iOS contact poster sets it (canvas "CallIncoming", 2026-10-21).
  top: { paddingHorizontal: space.xl, paddingTop: 38, gap: 4, alignItems: 'center' },
  slot: { fontSize: 17, fontWeight: '500', letterSpacing: -0.2, color: 'rgba(255,255,255,0.82)' },
  name: {
    fontSize: 44,
    lineHeight: 50,
    fontWeight: '700',
    letterSpacing: 0.2,
    color: colors.white,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 16,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  rings: { position: 'absolute' },
  actions: {
    gap: 14,
    paddingHorizontal: space.xl,
    paddingBottom: space.huge,
  },
  declinePill: {
    height: 52,
    borderRadius: inkRadius.pill,
    backgroundColor: ink.photoGlass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.photoGlassRim,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  declineLabel: { fontSize: 16, fontWeight: '600', color: colors.white },
});
