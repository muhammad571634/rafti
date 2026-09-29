import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
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
import { colors, gradients, radius, space } from '@/theme';

/** Stop ringing after this long and log it as missed, like a real phone. */
const RING_TIMEOUT_MS = 30_000;

/**
 * "Get phone call from your bias": the character calls you. Full-bleed portrait,
 * name top-left, decline / accept at the bottom.
 */
export default function IncomingCallScreen() {
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
          <LinearGradient colors={gradients.incoming} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
        </View>
      }>
      <View style={styles.top}>
        <Txt variant="h1" color={colors.white}>
          {displayName(character, relationship)}
        </Txt>
        <Txt variant="bodyStrong" color="rgba(255,255,255,0.85)">
          {slot ? t(`call.${slot}`) : t('call.calling')}
        </Txt>
      </View>

      <View style={styles.center}>
        <Anim name="calling" size={250} tint="rgba(255,255,255,0.65)" style={styles.rings} />
        <CharacterAvatar character={character} size={150} ring ringColor="rgba(255,255,255,0.9)" />
      </View>

      <View style={styles.actions}>
        <CallAction
          label={t('call.decline')}
          color={colors.danger}
          onPress={decline}
          icon={<MaterialCommunityIcons name="phone-hangup" size={30} color={colors.white} />}
        />
        <CallAction
          label={t('call.accept')}
          color={colors.success}
          onPress={accept}
          pulse
          icon={<Ionicons name="call" size={28} color={colors.white} />}
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
        <Animated.View style={[styles.actionButton, { backgroundColor: color }, animatedStyle]}>{icon}</Animated.View>
      </PressableScale>
      <Txt variant="smallStrong" color={colors.white}>
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  missing: { padding: space.xl },
  top: { paddingHorizontal: space.xxl, paddingTop: space.xxl, gap: space.xs },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  rings: { position: 'absolute' },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: space.xxl,
    paddingBottom: space.huge,
  },
  action: { alignItems: 'center', gap: space.sm },
  actionButton: {
    width: 70,
    height: 70,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
