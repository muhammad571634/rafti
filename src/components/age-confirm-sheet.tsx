import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { InkText, PillButton } from '@/components/ink';
import { NightYearWheel, type YearWheelHandle } from '@/components/onboarding/night-year-wheel';
import { Sheet } from '@/components/ui';
import { ADULT_AGE, adultYear, AGE_MIN_YEAR } from '@/lib/age-check';
import { haptic } from '@/lib/haptics';
import { useAppStore } from '@/store/use-app-store';
import { ink } from '@/theme/ink';

const DEFAULT_YEAR = 2000;
const BLOCKED = '#FF8A82';

/**
 * Confirm your age (src/lib/age-check.ts): the onboarding year wheel in a sheet. An adult year ends
 * the careful mode for every character; a year under 18 keeps it for good, said once in the note.
 * Opened from the chat's age card and from Edit profile.
 */
export function AgeConfirmSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const birthYear = useAppStore((s) => s.user.birthYear);
  const confirmAge = useAppStore((s) => s.confirmAge);
  const thisYear = new Date().getFullYear();
  const wheel = useRef<YearWheelHandle>(null);
  const [year, setYear] = useState(birthYear ?? DEFAULT_YEAR);
  const [refused, setRefused] = useState(false);
  // Fresh each time it opens.
  useEffect(() => {
    if (!visible) return;
    setYear(birthYear ?? DEFAULT_YEAR);
    setRefused(false);
  }, [visible, birthYear]);

  const minor = !adultYear(year);

  const confirm = () => {
    // The year in the band right now, even mid-fling (as the onboarding gate reads it).
    const picked = wheel.current?.year() ?? year;
    if (confirmAge(picked) === null) {
      haptic.success();
      return onClose();
    }
    haptic.error();
    setRefused(true);
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('ageCheck.confirmTitle')}>
      {/* A new key each time it opens: the wheel reads its year once. */}
      {visible ? (
        <View style={styles.wheel}>
          <NightYearWheel initial={birthYear ?? DEFAULT_YEAR} min={AGE_MIN_YEAR} max={thisYear} minAge={ADULT_AGE} onChange={setYear} handle={wheel} />
        </View>
      ) : null}
      <InkText variant="footnote" center color={refused || minor ? BLOCKED : ink.text2} style={styles.note}>
        {refused ? t('ageCheck.locked') : minor ? t('onboarding.ageBlocked') : t('onboarding.ageNote')}
      </InkText>
      {refused ? (
        <PillButton label={t('common.done')} onPress={onClose} kind="secondary" />
      ) : (
        <PillButton label={t('ageCheck.confirm')} onPress={confirm} />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  wheel: { height: 300, justifyContent: 'center' },
  note: { marginTop: 12, marginBottom: 16 },
});
