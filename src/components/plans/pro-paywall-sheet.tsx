import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, CharacterAvatar, Sheet, Txt } from '@/components/ui';
import { PLANS, TRIAL } from '@/economy/plans';
import { useAppStore } from '@/store/use-app-store';
import { colors, radius, space } from '@/theme';
import type { Character } from '@/types';

import { planTime } from './copy';

/**
 * The Pro offer for a Pro-only feature a free or Basic user tried (backend-plan §15.10):
 * "Take a photo" (pictures first) or adding a new character in its early-access week (that
 * character first). Starting the trial lets them go on at once. Calls and Bedtime use
 * `CallPaywallSheet`, which plays a voice sample first.
 */
export function ProPaywallSheet({
  visible,
  kind,
  character,
  onClose,
  onStarted,
}: {
  visible: boolean;
  kind: 'photo' | 'newCharacter';
  /** The new character, for `newCharacter`. */
  character?: Character;
  onClose: () => void;
  /** The trial is on: the caller goes on (takes the picture, adds the friend). */
  onStarted: () => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const trialUsed = useAppStore((s) => !!s.wallet.trialUsed);
  const subscribe = useAppStore((s) => s.subscribe);

  const start = () => {
    if (trialUsed) {
      // No free days left on this account: the plans, with Pro yearly picked.
      onClose();
      router.push('/store/shell?tab=plans&plan=proAnnual');
      return;
    }
    // Real builds open the store's purchase sheet with the free-trial offer.
    subscribe(TRIAL.plan, true);
    onStarted();
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={styles.head}>
        {kind === 'newCharacter' && character ? (
          <View style={styles.who}>
            <CharacterAvatar character={character} size={76} />
            <Txt variant="h3" center>
              {character.name}
            </Txt>
          </View>
        ) : (
          <View style={styles.art}>
            <Ionicons name="camera-outline" size={30} color={colors.primary} />
          </View>
        )}
        <Txt variant="h2" center>
          {kind === 'newCharacter' ? t('newCharacters.proTitle') : t('photoBooth.proTitle')}
        </Txt>
      </View>

      <View style={styles.perks}>
        {[
          kind === 'newCharacter'
            ? t('plans.newCharacters')
            : t('plans.photosMonth', { count: PLANS.proAnnual.photos }),
          t('plans.callsPerk', { time: planTime(t, PLANS.proAnnual.callSeconds) }),
          t('plans.shellsMonth', { amount: PLANS.proAnnual.shells.toLocaleString('en-US') }),
        ].map((perk) => (
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
        <Button label={t('plans.notNow')} variant="ghost" full onPress={onClose} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { alignItems: 'center', gap: space.md, marginTop: space.xs },
  who: { alignItems: 'center', gap: space.xs },
  art: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  perks: { gap: space.sm + 2, marginTop: space.lg },
  perk: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  actions: { gap: space.sm, marginTop: space.lg },
});
