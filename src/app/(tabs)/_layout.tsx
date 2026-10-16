import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale, Txt } from '@/components/ui';
import { useTabsGate, useUnreadTotal } from '@/hooks/use-tabs-gate';
import { colors, radius, shadows, space } from '@/theme';

/** expo-router ships its own bottom-tab types; derive them from the component. */
type TabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/** Each tab's line icon and the filled twin it shows while current. */
const ICONS: Record<string, { off: IoniconName; on: IoniconName }> = {
  index: { off: 'home-outline', on: 'home' },
  chat: { off: 'chatbubble-outline', on: 'chatbubble' },
  us: { off: 'heart-outline', on: 'heart' },
};

/** The bar's height; `TAB_BAR_HEIGHT` leaves room for it. */
const BAR = 62;

/**
 * Android and web. iOS uses the system tab bar instead (`_layout.ios.tsx`), Liquid Glass on
 * iOS 26 and later; this one draws the same layout.
 */
export default function TabsLayout() {
  const gate = useTabsGate();

  // Saved data decides whether this is a first launch, so wait for it.
  if (gate === 'loading') return null;
  if (gate === 'onboarding') return <Redirect href="/onboarding" />;

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <GlassTabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="us" />
      <Tabs.Screen name="find" />
    </Tabs>
  );
}

/**
 * A floating frosted pill holding Today, Chats and Us, with Find as its own round button beside
 * it, the way iOS sets the search tab apart (approved prototype
 * https://claude.ai/artifact/WTWWPXiX17USrgcgYAdRQg). Labels are bold; the current tab sits in
 * a soft capsule with its icon filled in peach; unread chats show one small dot.
 */
function GlassTabBar({ state, navigation }: TabBarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const unread = useUnreadTotal();

  const open = (name: string, key: string, focused: boolean) => {
    const event = navigation.emit({ type: 'tabPress', target: key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigation.navigate(name);
  };

  const tabs = state.routes.map((route, index) => ({ route, focused: state.index === index }));
  const find = tabs.find(({ route }) => route.name === 'find');

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + space.md }]}>
      <View style={[styles.pill, styles.glass]}>
        {tabs
          .filter(({ route }) => route.name !== 'find')
          .map(({ route, focused }) => {
            const label = t(`tabs.${route.name === 'index' ? 'home' : route.name}`);
            const icon = ICONS[route.name] ?? ICONS.index;
            const hasUnread = route.name === 'chat' && unread > 0;
            return (
              <PressableScale
                key={route.key}
                style={[styles.item, focused && styles.itemOn]}
                scaleTo={0.94}
                dimOnPress={false}
                accessibilityRole="tab"
                accessibilityLabel={hasUnread ? t('a11y.unreadTab', { label, count: unread }) : label}
                accessibilityState={{ selected: focused }}
                onPress={() => open(route.name, route.key, focused)}>
                <View>
                  <Ionicons
                    name={focused ? icon.on : icon.off}
                    size={23}
                    color={focused ? colors.primary : colors.tabActive}
                  />
                  {hasUnread ? <View style={styles.dot} /> : null}
                </View>
                <Txt variant="tiny" color={colors.tabActive} style={styles.label}>
                  {label}
                </Txt>
              </PressableScale>
            );
          })}
      </View>

      {find ? (
        <PressableScale
          style={[styles.round, styles.glass]}
          scaleTo={0.92}
          dimOnPress={false}
          accessibilityRole="tab"
          accessibilityLabel={t('tabs.find')}
          accessibilityState={{ selected: find.focused }}
          onPress={() => open(find.route.name, find.route.key, find.focused)}>
          <View style={[styles.roundInner, find.focused && styles.itemOn]}>
            <Ionicons name="search" size={24} color={find.focused ? colors.primary : colors.tabActive} />
          </View>
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 2,
  },
  glass: {
    backgroundColor: colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassLine,
    ...shadows.glass,
  },
  pill: {
    flex: 1,
    height: BAR,
    borderRadius: BAR / 2,
    flexDirection: 'row',
    alignItems: 'center',
    padding: space.xs,
  },
  item: {
    flex: 1,
    height: BAR - space.sm,
    borderRadius: (BAR - space.sm) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  itemOn: { backgroundColor: colors.glassActive },
  label: { fontWeight: '700' },
  round: { width: BAR, height: BAR, borderRadius: BAR / 2, padding: space.xs },
  roundInner: { flex: 1, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  dot: {
    position: 'absolute',
    top: -1,
    right: -4,
    width: 9,
    height: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
});
