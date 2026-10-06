import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DailyRewardSheet } from '@/components/daily-reward-sheet';
import { PressableScale, Txt } from '@/components/ui';
import { useCharacterInitiative } from '@/hooks/use-character-initiative';
import { useAppStore } from '@/store/use-app-store';
import { colors, radius, space, TAB_BAR_HEIGHT } from '@/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
/** expo-router ships its own bottom-tab types; derive them from the component. */
type TabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

const ICONS: Record<string, { active: IoniconName; idle: IoniconName }> = {
  index: { active: 'home', idle: 'home-outline' },
  chat: { active: 'chatbubble', idle: 'chatbubble-outline' },
  us: { active: 'heart', idle: 'heart-outline' },
  find: { active: 'compass', idle: 'compass-outline' },
};

export default function TabsLayout() {
  useCharacterInitiative();

  return (
    <>
      <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="chat" />
        <Tabs.Screen name="us" />
        <Tabs.Screen name="find" />
      </Tabs>
      <DailyRewardSheet />
    </>
  );
}

/**
 * A flat white bar under a hairline. The current tab is ink with a filled glyph;
 * unread chats show as one small apricot dot rather than a number.
 */
function TabBar({ state, navigation }: TabBarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const unread = useAppStore((s) => s.conversations.reduce((sum, c) => sum + c.unreadCount, 0));

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom || space.sm }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const icon = ICONS[route.name] ?? ICONS.index;
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
              <Ionicons name={focused ? icon.active : icon.idle} size={23} color={tint} />
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
    paddingTop: space.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  labelActive: { fontWeight: '600' },
  dot: {
    position: 'absolute',
    top: -1,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
});
