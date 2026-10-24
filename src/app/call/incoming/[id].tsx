import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Anim, CharacterAvatar, PressableScale, Screen, Txt, characterImage } from '@/components/ui';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, gradients, space, systemColors } from '@/theme';

/** Stop ringing after this long and log it as missed, like a real phone. */
const RING_TIMEOUT_MS = 30_000;

/**
 * "Get phone call from your bias": the character calls you. Full-bleed portrait,
 * name top-left, decline / accept at the bottom.
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
        <CallAction
          label={t('call.decline')}
          color={systemColors.red}
          onPress={decline}
          icon={<MaterialCommunityIcons name="phone-hangup" size={32} color={colors.white} />}
        />
        <CallAction
          label={t('call.accept')}
          color={systemColors.green}
          onPress={accept}
          pulse
          icon={<Ionicons name="call" size={30} color={colors.white} />}
        />
      </View>
    </Screen>
  );
}

function CallAction({
  label,
  color,
  icon,
  pulse,
  onPress,
}: {
  label: string;
  color: string;
  icon: React.ReactNode;
  pulse?: boolean;
  onPress: () => void;
}) {
  const t = useSharedValue(0);

  useEffect(() => {
    if (!pulse) return;
    t.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 520, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 520, easing: Easing.in(Easing.quad) }),
      ),
      -1,
    );
  }, [pulse, t]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -t.value * 8 }, { rotate: `${(t.value - 0.5) * 16}deg` }],
  }));

  return (
    <View style={styles.action}>
      <PressableScale onPress={onPress} scaleTo={0.9} haptic accessibilityRole="button" accessibilityLabel={label}>
        <View style={[styles.actionButton, { backgroundColor: color, shadowColor: color }]}>
          <Animated.View style={animatedStyle}>{icon}</Animated.View>
        </View>
      </PressableScale>
      <Txt style={styles.actionLabel}>{label}</Txt>
    </View>
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
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 16,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  rings: { position: 'absolute' },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingBottom: space.huge,
  },
  action: { width: 96, alignItems: 'center', gap: 10 },
  actionButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  actionLabel: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});
