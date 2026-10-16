import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTranslation } from 'react-i18next';

import { useTabsGate, useUnreadTotal } from '@/hooks/use-tabs-gate';
import { colors } from '@/theme';

/**
 * iOS: the system tab bar, Liquid Glass on iOS 26 and later (approved prototype
 * https://claude.ai/artifact/WTWWPXiX17USrgcgYAdRQg). Find is the search tab, set apart on its
 * own; labels are bold; unread chats show a plain badge dot. Android and web draw the same
 * layout themselves (`_layout.tsx`).
 */
export default function TabsLayout() {
  const { t } = useTranslation();
  const gate = useTabsGate();
  const unread = useUnreadTotal();

  // Saved data decides whether this is a first launch, so wait for it.
  if (gate === 'loading') return null;
  if (gate === 'onboarding') return <Redirect href="/onboarding" />;

  return (
    <NativeTabs tintColor={colors.primary} labelStyle={{ fontWeight: '700' }} badgeBackgroundColor={colors.primary}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <NativeTabs.Trigger.Label>{t('tabs.home')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="chat">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'bubble.left.and.bubble.right', selected: 'bubble.left.and.bubble.right.fill' }}
        />
        <NativeTabs.Trigger.Label>{t('tabs.chat')}</NativeTabs.Trigger.Label>
        {unread > 0 ? <NativeTabs.Trigger.Badge /> : null}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="us">
        <NativeTabs.Trigger.Icon sf={{ default: 'heart', selected: 'heart.fill' }} />
        <NativeTabs.Trigger.Label>{t('tabs.us')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="find" role="search">
        <NativeTabs.Trigger.Icon sf="magnifyingglass" />
        <NativeTabs.Trigger.Label>{t('tabs.find')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
