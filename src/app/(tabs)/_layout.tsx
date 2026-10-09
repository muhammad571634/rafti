import { Image } from 'expo-image';
import { Redirect, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_ICONS, type TabIconName } from '@/assets/brand/registry';
import { PressableScale, Txt } from '@/components/ui';
import { useCharacterInitiative } from '@/hooks/use-character-initiative';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { useAppStore } from '@/store/use-app-store';
import { colors, radius, space, TAB_BAR_HEIGHT } from '@/theme';

/** expo-router ships its own bottom-tab types; derive them from the component. */
type TabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

/** Clay tab art: a step down from the Home module icons (68), well above a line glyph. */
const TAB_ICON = 44;

export default function TabsLayout() {
  useCharacterInitiative();
  usePushNotifications();
  const hydrated = useAppStore((s) => s.hydrated);
  const onboarded = useAppStore((s) => !!s.user.onboardedAt);

  // Saved data decides whether this is a first launch, so wait for it.
  if (!hydrated) return null;
  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    <>
      <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="chat" />
        <Tabs.Screen name="us" />
        <Tabs.Screen name="find" />
      </Tabs>
    </>
  );
}

/**
 * The tab bar sits on the canvas with no line or fill. The current tab shows its clay
 * icon in colour, the rest the same art in soft grey; unread chats show as one small
 * apricot dot rather than a number.
 */
function TabBar({ state, navigation }: TabBarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const unread = useAppStore((s) => s.conversations.reduce((sum, c) => sum + c.unreadCount, 0));

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom || space.sm }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const art = TAB_ICONS[(route.name in TAB_ICONS ? route.name : 'index') as TabIconName];
        const label = t(`tabs.${route.name === 'index' ? 'home' : route.name}`);
        const hasUnread = route.name === 'chat' && unread > 0;
        const tint = focused ? colors.tabActive : colors.tabInactive;

        return (
          <PressableScale
            key={route.key}
            style={styles.item}
            scaleTo={1}
            dimOnPress={false}
            accessibilityRole="tab"
            accessibilityLabel={hasUnread ? t('a11y.unreadTab', { label, count: unread }) : label}
            accessibilityState={{ selected: focused }}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}>
            <View>
              <Image source={focused ? art.on : art.off} style={styles.icon} contentFit="contain" />
              {hasUnread ? <View style={styles.dot} /> : null}
            </View>
            <Txt variant="tiny" color={tint} style={focused && styles.labelActive}>
              {label}
            </Txt>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    minHeight: TAB_BAR_HEIGHT,
    paddingTop: space.xs,
    backgroundColor: colors.bgPlain,
  },
  icon: { width: TAB_ICON, height: TAB_ICON },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  labelActive: { fontWeight: '600' },
  dot: {
    position: 'absolute',
    top: 2,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.bgPlain,
  },
});
