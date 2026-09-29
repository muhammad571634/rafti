import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Share, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import {
  Anim,
  BlurBackdrop,
  CharacterAvatar,
  Mascot,
  PressableScale,
  Screen,
  Txt,
  characterImage,
} from '@/components/ui';
import { callClock } from '@/lib/format';
import { callScript, displayName, useAppStore } from '@/store/use-app-store';
import { colors, fonts, gradients, palette, radius, shadows, space } from '@/theme';

type CallState = 'connecting' | 'active';

/** How long each subtitle line stays up — a stand-in for streamed TTS. */
const SUBTITLE_INTERVAL_MS = 5000;

/**
 * The in-call screen: blurred portrait, sticker avatar, timer, live subtitles and
 * one red button — nothing else competes with the voice.
 */
export default function CallScreen() {
  const { id, incoming } = useLocalSearchParams<{ id: string; incoming?: string }>();
  const characterId = Array.isArray(id) ? id[0] : id;
  const answered = incoming === '1';

  const { t } = useTranslation();
  const router = useRouter();

  const character = useAppStore((s) => s.characters.find((c) => c.id === characterId));
  const relationship = useAppStore((s) => (characterId ? s.relationships[characterId] : undefined));
  const addCall = useAppStore((s) => s.addCall);

  const [state, setState] = useState<CallState>(answered ? 'active' : 'connecting');
  const [seconds, setSeconds] = useState(0);
  const [line, setLine] = useState(0);
  const startedAt = useRef(new Date().toISOString());

  const lines = useMemo(() => (character ? callScript(character) : []), [character]);

  useEffect(() => {
    if (state !== 'connecting') return;
    const timer = setTimeout(() => setState('active'), 1600);
    return () => clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    if (state !== 'active') return;
    const tick = setInterval(() => setSeconds((s) => s + 1), 1000);
    const subtitle = setInterval(() => setLine((l) => (l + 1) % Math.max(1, lines.length)), SUBTITLE_INTERVAL_MS);
    return () => {
      clearInterval(tick);
      clearInterval(subtitle);
    };
  }, [state, lines.length]);

  if (!character) {
    return (
      <Screen>
        <Txt style={styles.missing}>{t('errors.notFound')}</Txt>
      </Screen>
    );
  }

  const name = displayName(character, relationship);

  const hangUp = () => {
    if (seconds > 0) {
      addCall({
        characterId: character.id,
        startedAt: startedAt.current,
        durationSec: seconds,
        direction: answered ? 'incoming' : 'outgoing',
        missed: false,
      });
    }
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const share = () => {
    Share.share({ message: t('call.shareMessage', { name }) }).catch(() => {});
  };

  return (
    <Screen
      background={gradients.call}
      statusBarStyle="light"
      backdrop={<BlurBackdrop source={characterImage(character)} dim={0.22} blur={50} />}>
      <LinearGradient colors={['rgba(0,0,0,0.18)', 'transparent']} style={styles.topScrim} />

      <PressableScale
        style={styles.share}
        hitSlop={10}
        scaleTo={0.88}
        accessibilityLabel={t('a11y.share')}
        onPress={share}>
        <Ionicons name="arrow-redo" size={26} color={colors.white} />
      </PressableScale>

      <View style={styles.body}>
        <View style={styles.avatarWrap}>
          {state === 'connecting' ? (
            <Anim name="calling" size={240} tint="rgba(255,255,255,0.7)" style={styles.rings} />
          ) : null}
          <CharacterAvatar character={character} size={176} />
          <View style={[styles.sticker, shadows.raised]}>
            <Mascot size={34} />
          </View>
        </View>

        <Txt variant="h2" color={colors.white} center style={styles.name}>
          {name}
        </Txt>

        <Txt variant="smallStrong" color="rgba(255,255,255,0.9)" center style={styles.timer}>
          {state === 'connecting' ? t('call.connecting') : callClock(seconds)}
        </Txt>

        {state === 'active' ? (
          <Animated.View key={line} entering={FadeIn.duration(320)} exiting={FadeOut.duration(200)}>
            <Txt variant="bodyStrong" color={colors.white} center style={styles.subtitle}>
              {lines[line]}
            </Txt>
          </Animated.View>
        ) : null}
      </View>

      <View style={styles.controls}>
        <PressableScale
          style={[styles.hangUp, shadows.raised]}
          onPress={hangUp}
          scaleTo={0.9}
          haptic
          accessibilityRole="button"
          accessibilityLabel="Hang up">
          <MaterialCommunityIcons name="phone-hangup" size={32} color={colors.white} />
        </PressableScale>
      </View>

      <Txt color="rgba(255,255,255,0.4)" center style={styles.brand}>
        {t('app.name')}
      </Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  missing: { padding: space.xl },
  topScrim: { position: 'absolute', top: 0, left: 0, right: 0, height: 140 },
  share: { position: 'absolute', top: space.xl, right: space.xl, zIndex: 2 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xxxl },
  avatarWrap: { alignItems: 'center', justifyContent: 'center' },
  rings: { position: 'absolute' },
  sticker: {
    position: 'absolute',
    right: 4,
    bottom: 8,
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: palette.apricot50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  name: { marginTop: space.xxl },
  timer: { marginTop: space.xs, letterSpacing: 1 },
  subtitle: { marginTop: space.xxl, lineHeight: 22 },
  controls: { alignItems: 'center', paddingBottom: space.lg },
  hangUp: {
    width: 68,
    height: 68,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    paddingBottom: space.xl,
    fontFamily: fonts.display,
    fontSize: 18,
    letterSpacing: 2,
  },
});
