import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Anim, Button, CharacterAvatar, PressableScale, Sheet, Txt } from '@/components/ui';
import { PLANS, TRIAL } from '@/economy/plans';
import { duration, shortName } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useAppStore } from '@/store/use-app-store';
import { colors, radius, space } from '@/theme';
import type { Character } from '@/types';

import { planTime } from './copy';

/** The recorded line is this long. */
const SAMPLE_SECONDS = 6;

/**
 * A free user taps call (or Bedtime's "Sleep together"): they hear the voice first (a short
 * recorded line, never a live call), then see what Pro adds. Starting the trial goes straight
 * to the call or the sleep timer.
 */
export function CallPaywallSheet({
  visible,
  character,
  name,
  kind = 'call',
  onClose,
  onStarted,
}: {
  visible: boolean;
  character: Character;
  name: string;
  /** What the user tried: a call, or Bedtime whispers (Pro only, backend-plan §15.10). */
  kind?: 'call' | 'bedtime';
  onClose: () => void;
  /** The plan (or trial) is on: the caller starts the call or the timer. */
  onStarted: () => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const trialUsed = useAppStore((s) => !!s.wallet.trialUsed);
  const subscribe = useAppStore((s) => s.subscribe);
  const [left, setLeft] = useState<number | null>(null);

  // Real builds play the character's cached sample with expo-audio; the mock runs the clock.
  useEffect(() => {
    if (left == null) return;
    if (left <= 0) {
      setLeft(null);
      return;
    }
    const timer = setTimeout(() => setLeft((s) => (s == null ? null : s - 1)), 1000);
    return () => clearTimeout(timer);
  }, [left]);

  const close = () => {
    setLeft(null);
    onClose();
  };

  const start = () => {
    setLeft(null);
    if (trialUsed) {
      // No free days left on this account: the plans, with Pro yearly picked.
      onClose();
      router.push('/store/shell?tab=plans&plan=proAnnual');
      return;
    }
    // Real builds open the store's purchase sheet with the free-trial offer.
    subscribe(TRIAL.plan, true);
    haptic.success();
    onStarted();
  };

  const playing = left != null;
  const bedtime = kind === 'bedtime';
  const sampleLabel = bedtime
    ? t('bedtime.hearWhisper', { name: shortName(name) })
    : t('plans.hearVoice', { name: shortName(name) });

  return (
    <Sheet visible={visible} onClose={close}>
      <View style={styles.who}>
        <CharacterAvatar character={character} size={92} />
        <Txt variant="h3" center>
          {name}
        </Txt>
        {character.voiceReady ? (
          <Txt variant="smallStrong" color={colors.bondText} center>
            {t('plans.voiceReady')}
          </Txt>
        ) : null}
      </View>

      <PressableScale
        onPress={() => setLeft(playing ? null : SAMPLE_SECONDS)}
        scaleTo={0.98}
        accessibilityLabel={sampleLabel}
        style={styles.sample}>
        <View style={styles.play}>
          <Ionicons name={playing ? 'pause' : 'play'} size={18} color={colors.textOnInk} />
        </View>
        <Txt variant="bodyStrong" style={styles.flex} lines={1}>
          {sampleLabel}
        </Txt>
        {playing ? <Anim name="voiceWave" size={24} tint={colors.textSecondary} /> : null}
        <Txt variant="small" color={colors.textSecondary} style={styles.clock}>
          {duration(left ?? SAMPLE_SECONDS)}
        </Txt>
      </PressableScale>
      {playing ? (
        <Animated.View entering={FadeIn.duration(240)}>
          <Txt variant="small" color={colors.textSecondary} center style={styles.said}>
            {`“${bedtime ? t('bedtime.sampleLine') : character.greeting}”`}
          </Txt>
        </Animated.View>
      ) : null}

      <View style={styles.offer}>
        <Txt variant="h2">{bedtime ? t('bedtime.proTitle') : t('plans.callsTitle')}</Txt>
        {[
          bedtime ? t('plans.bedtime') : null,
          t('plans.callsPerk', { time: planTime(t, PLANS.proAnnual.callSeconds) }),
          bedtime ? null : t('plans.voicePerk', { time: planTime(t, PLANS.proAnnual.voiceSeconds) }),
          t('plans.shellsMonth', { amount: PLANS.proAnnual.shells.toLocaleString('en-US') }),
        ]
          .filter((perk): perk is string => perk != null)
          .map((perk) => (
            <View key={perk} style={styles.perk}>
              <Ionicons name="checkmark" size={17} color={colors.text} />
              <Txt variant="body" style={styles.flex}>
                {perk}
              </Txt>
            </View>
          ))}
      </View>

      <View style={styles.actions}>
        <Button
          label={
            trialUsed
              ? t('plans.get', { plan: t('plans.name.proAnnual'), price: PLANS.proAnnual.price })
              : t('plans.startTrial', { count: TRIAL.days })
          }
          size="lg"
          full
          onPress={start}
        />
        <Txt variant="caption" color={colors.textMuted} center>
          {trialUsed ? t('plans.billed.proAnnual') : t('plans.trialCaptionSettings', { price: PLANS[TRIAL.plan].price })}
        </Txt>
        <Button label={t('plans.notNow')} variant="ghost" full onPress={close} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  who: { alignItems: 'center', gap: space.xxs, marginTop: space.xs },
  sample: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 56,
    marginTop: space.lg,
    paddingVertical: space.sm,
    paddingLeft: space.sm,
    paddingRight: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgPlain,
  },
  play: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clock: { fontVariant: ['tabular-nums'] },
  said: { marginTop: space.sm, paddingHorizontal: space.md },
  offer: { gap: space.sm + 2, marginTop: space.lg },
  perk: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  actions: { gap: space.sm, marginTop: space.lg },
});
