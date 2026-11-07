import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTranslation } from 'react-i18next';

import { badgeText, useTabsGate, useUnreadChats } from '@/hooks/use-tabs-gate';
import { playful } from '@/theme';

/**
 * iOS: the system tab bar, Liquid Glass on iOS 26 and later (approved prototype
 * https://claude.ai/artifact/WTWWPXiX17USrgcgYAdRQg). Find is the search tab, set apart on its
 * own; labels are bold. The tint is the playful ink, as the Android bar's current tab (four-tab
 * prototype); Chats carries the number of chats waiting in the system's red badge, the same number
 * Today and Chats show. (The badge had no text before, and a NativeTabs badge without text is not
 * drawn: iPhone showed no unread mark at all.) Android and web draw the same layout themselves
 * (`_layout.tsx`).
 */
export default function TabsLayout() {
  const { t } = useTranslation();
  const gate = useTabsGate();
  const unread = useUnreadChats();

  // Saved data decides whether this is a first launch, so wait for it.
  if (gate === 'loading') return null;
  if (gate === 'onboarding') return <Redirect href="/onboarding" />;

  return (
    <NativeTabs tintColor={playful.ink} labelStyle={{ fontWeight: '700' }} badgeBackgroundColor={playful.red}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <NativeTabs.Trigger.Label>{t('tabs.home')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="chat">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'bubble.left.and.bubble.right', selected: 'bubble.left.and.bubble.right.fill' }}
        />
        <NativeTabs.Trigger.Label>{t('tabs.chat')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Badge hidden={unread === 0}>{badgeText(unread)}</NativeTabs.Trigger.Badge>
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
