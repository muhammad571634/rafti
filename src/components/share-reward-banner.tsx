import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ShellIcon, Txt } from '@/components/ui';
import { useAppStore } from '@/store/use-app-store';
import { colors, palette, radius, shadows, space } from '@/theme';

const SHOW_MS = 2600;

/** "+6 shells for sharing", wherever the share happened; it appears at once and leaves on its own. */
export function ShareRewardBanner() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const amount = useAppStore((s) => s.shareReward);
  const dismiss = useAppStore((s) => s.dismissShareReward);

  useEffect(() => {
    if (amount == null) return;
    const timer = setTimeout(dismiss, SHOW_MS);
    return () => clearTimeout(timer);
  }, [amount, dismiss]);

  if (amount == null) return null;

  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + space.sm }]}>
      <View style={[styles.pill, shadows.modal]} accessibilityLiveRegion="polite">
        <ShellIcon size={18} />
        <Txt variant="smallStrong" color={palette.shellText}>
          +{amount}
        </Txt>
        <Txt variant="smallStrong">{t('gifts.sharedReward')}</Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.lg,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
});
