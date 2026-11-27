import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTranslation } from 'react-i18next';

import { badgeText, useTabsGate, useUnreadChats } from '@/hooks/use-tabs-gate';
import { playful } from '@/theme';
import { ink } from '@/theme/ink';

/**
 * iOS: the system tab bar, Liquid Glass on iOS 26 and later (approved Variant A + Apple Story &
 * Sparkle icons, 2026-11-21). All four tabs sit in one unified bar with Sigmazam's brand-peach
 * tint (`ink.accent`) and matching SF Symbols (`sparkles`, `ellipsis.bubble`, `heart`,
 * `square.grid.2x2`).
 */
export default function TabsLayout() {
  const { t } = useTranslation();
  const gate = useTabsGate();
  const unread = useUnreadChats();

  // Saved data decides whether this is a first launch, so wait for it.
  if (gate === 'loading') return null;
  if (gate === 'onboarding') return <Redirect href="/onboarding" />;

  return (
    <NativeTabs tintColor={ink.accent} labelStyle={{ fontWeight: '700' }} badgeBackgroundColor={playful.red}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: 'sparkles', selected: 'sparkles' }} />
        <NativeTabs.Trigger.Label>{t('tabs.home')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="chat">
        <NativeTabs.Trigger.Icon sf={{ default: 'ellipsis.bubble', selected: 'ellipsis.bubble.fill' }} />
        <NativeTabs.Trigger.Label>{t('tabs.chat')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Badge hidden={unread === 0}>{badgeText(unread)}</NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="us">
        <NativeTabs.Trigger.Icon sf={{ default: 'heart', selected: 'heart.fill' }} />
        <NativeTabs.Trigger.Label>{t('tabs.us')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="find">
        <NativeTabs.Trigger.Icon sf={{ default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' }} />
        <NativeTabs.Trigger.Label>{t('tabs.find')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
