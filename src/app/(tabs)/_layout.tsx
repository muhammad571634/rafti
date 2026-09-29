import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DailyRewardSheet } from '@/components/daily-reward-sheet';
import { PressableScale, Txt } from '@/components/ui';
import { useCharacterInitiative } from '@/hooks/use-character-initiative';
import { useAppStore } from '@/store/use-app-store';
import { colors, radius, shadows, space, TAB_BAR_HEIGHT } from '@/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
/** expo-router ships its own bottom-tab types; derive them from the component. */
type TabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

const ICONS: Record<string, { active: IoniconName; idle: IoniconName }> = {
  index: { active: 'home', idle: 'home-outline' },
  chat: { active: 'chatbox-ellipses', idle: 'chatbox-ellipses-outline' },
  us: { active: 'heart', idle: 'heart-outline' },
  find: { active: 'search-circle', idle: 'search-outline' },
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

function TabBar({ state, navigation }: TabBarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const unread = useAppStore((s) => s.conversations.reduce((sum, c) => sum + c.unreadCount, 0));

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom || space.sm }, shadows.bar]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const icon = ICONS[route.name] ?? ICONS.index;
        const badge = route.name === 'chat' ? unread : 0;

        return (
          <PressableScale
            key={route.key}
            style={styles.item}
            scaleTo={0.9}
            dimOnPress={false}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}>
            <View>
              <Ionicons
                name={focused ? icon.active : icon.idle}
                size={route.name === 'find' && focused ? 27 : 24}
                color={focused ? colors.tabActive : colors.tabInactive}
              />
              {badge > 0 ? (
                <View style={styles.badge}>
                  <Txt variant="tiny" color={colors.white}>
                    {badge > 99 ? '99+' : badge}
                  </Txt>
                </View>
              ) : null}
            </View>
            <Txt variant="tiny" color={focused ? colors.tabActive : colors.tabInactive}>
              {t(`tabs.${route.name === 'index' ? 'home' : route.name}`)}
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
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
});
