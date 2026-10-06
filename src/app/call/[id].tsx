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
  PressableScale,
  Screen,
  Txt,
  characterImage,
} from '@/components/ui';
import { callClock } from '@/lib/format';
import { callScript, displayName, useAppStore } from '@/store/use-app-store';
import { colors, gradients, radius, space } from '@/theme';

type CallState = 'connecting' | 'active';

/** How long each subtitle line stays up — a stand-in for streamed TTS. */
const SUBTITLE_INTERVAL_MS = 5000;

/**
 * The in-call screen: blurred portrait, avatar, timer and live subtitles, with
 * mute / end / speaker underneath — nothing else competes with the voice.
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
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
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
      backdrop={<BlurBackdrop source={characterImage(character)} dim={0.3} blur={50} />}>
      <LinearGradient colors={['rgba(0,0,0,0.18)', 'transparent']} style={styles.topScrim} />

      <View style={styles.top}>
        <View style={styles.topSide} />
        <Txt variant="caption" color={colors.onMediaMuted} center style={styles.flex}>
          {t('call.free')}
        </Txt>
        <PressableScale
          style={styles.topSide}
          hitSlop={10}
          scaleTo={0.88}
          accessibilityLabel={t('a11y.share')}
          onPress={share}>
          <Ionicons name="share-outline" size={22} color={colors.onMedia} />
        </PressableScale>
      </View>

      <View style={styles.body}>
        <View style={styles.avatarWrap}>
          {state === 'connecting' ? (
            <Anim name="calling" size={230} tint="rgba(255,255,255,0.7)" style={styles.rings} />
          ) : null}
          <CharacterAvatar character={character} size={150} ring ringColor="rgba(255,255,255,0.85)" />
        </View>

        <Txt variant="h2" color={colors.onMedia} center style={styles.name}>
          {name}
        </Txt>

        <Txt variant="small" color={colors.onMediaMuted} center style={styles.timer}>
          {state === 'connecting' ? t('call.connecting') : callClock(seconds)}
        </Txt>

        {state === 'active' ? (
          <Animated.View key={line} entering={FadeIn.duration(320)} exiting={FadeOut.duration(200)}>
            <Txt variant="title" color={colors.onMedia} center style={styles.subtitle}>
              {`“${lines[line]}”`}
            </Txt>
          </Animated.View>
        ) : null}
      </View>

      <View style={styles.controls}>
        <CallControl
          icon={muted ? 'mic-off' : 'mic-off-outline'}
          label={muted ? t('call.unmute') : t('call.mute')}
          active={muted}
          onPress={() => setMuted((v) => !v)}
        />
        <View style={styles.control}>
          <View style={styles.slot}>
            <PressableScale
              style={styles.hangUp}
              onPress={hangUp}
              scaleTo={0.9}
              haptic
              accessibilityRole="button"
              accessibilityLabel={t('call.end')}>
              <MaterialCommunityIcons name="phone-hangup" size={30} color={colors.onMedia} />
            </PressableScale>
          </View>
          <Txt variant="caption" color={colors.onMediaMuted}>
            {t('call.end')}
          </Txt>
        </View>
        <CallControl
          icon={speaker ? 'volume-high' : 'volume-high-outline'}
          label={t('call.speaker')}
          active={speaker}
          onPress={() => setSpeaker((v) => !v)}
        />
      </View>
    </Screen>
  );
}

/**
 * A round glass toggle beside the hang-up button. The mock has no audio session yet,
 * so mute and speaker only change state; real builds route them to expo-audio.
 */
function CallControl({
  icon,
  label,
  active,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.control}>
      <View style={styles.slot}>
        <PressableScale
          style={[styles.toggle, active && styles.toggleActive]}
          onPress={onPress}
          scaleTo={0.9}
          accessibilityRole="switch"
          accessibilityLabel={label}
          accessibilityState={{ checked: active }}
          aria-checked={active}>
          <Ionicons name={icon} size={24} color={active ? colors.text : colors.onMedia} />
        </PressableScale>
      </View>
      <Txt variant="caption" color={colors.onMediaMuted}>
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  missing: { padding: space.xl },
  topScrim: { position: 'absolute', top: 0, left: 0, right: 0, height: 140 },
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingTop: space.md },
  topSide: { width: 40, alignItems: 'flex-end' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xxl },
  avatarWrap: { alignItems: 'center', justifyContent: 'center' },
  rings: { position: 'absolute' },
  name: { marginTop: space.xl },
  timer: { marginTop: space.xs, fontVariant: ['tabular-nums'] },
  subtitle: { marginTop: space.xxl, lineHeight: 24 },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-start',
    paddingHorizontal: space.lg,
    paddingBottom: space.xxxl,
  },
  control: { alignItems: 'center', gap: space.sm, width: 84 },
  // Every button sits in a slot as tall as the hang-up, so the labels line up.
  slot: { height: 68, justifyContent: 'center' },
  toggle: {
    width: 58,
    height: 58,
    borderRadius: radius.pill,
    backgroundColor: colors.onMediaGlass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleActive: { backgroundColor: colors.onMedia },
  hangUp: {
    width: 68,
    height: 68,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
