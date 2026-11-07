import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, Tabs } from 'expo-router';
import { memo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale, SFIcon, Txt } from '@/components/ui';
import { badgeText, useTabsGate, useUnreadChats } from '@/hooks/use-tabs-gate';
import { colors, playful, space } from '@/theme';

/** expo-router ships its own bottom-tab types; derive them from the component. */
type TabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];
type Icon = React.ComponentProps<typeof SFIcon>;

/**
 * Each tab's line icon and the filled twin it shows while current: the iOS bar's SF Symbols, and
 * the Ionicons closest to them where SF Symbols may not be drawn.
 */
const ICONS: Record<string, { off: Pick<Icon, 'ios' | 'icon'>; on: Pick<Icon, 'ios' | 'icon'> }> = {
  index: { off: { ios: 'house', icon: 'home-outline' }, on: { ios: 'house.fill', icon: 'home' } },
  chat: {
    off: { ios: 'bubble.left.and.bubble.right', icon: 'chatbubbles-outline' },
    on: { ios: 'bubble.left.and.bubble.right.fill', icon: 'chatbubbles' },
  },
  us: { off: { ios: 'heart', icon: 'heart-outline' }, on: { ios: 'heart.fill', icon: 'heart' } },
};

/** The bar's height; `TAB_BAR_HEIGHT` leaves room for it. */
const BAR = 62;
/** How far above the bar the content starts to fade. */
const FADE_ABOVE = 28;

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
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <PlayfulTabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="us" />
      <Tabs.Screen name="find" />
    </Tabs>
  );
}

/**
 * A white floating shape with a soft shadow. No live blur: on Android it redraws the whole screen
 * into a full-size layer for each glass shape on every frame (atrace on a Galaxy A51), and iPhone
 * has the system tab bar (`_layout.ios.tsx`).
 */
function Floating({ style, children }: { style: StyleProp<ViewStyle>; children: ReactNode }) {
  return <View style={[styles.floating, style]}>{children}</View>;
}

/**
 * The playful tab bar of the approved four-tab prototype (0z124): a white pill holding Today,
 * Chats and Us, with Find as its own round button beside it, the way iOS sets the search tab apart.
 * The current tab is an ink capsule with a white icon and label; the rest are ink at 60 %. Chats
 * carries the number of chats waiting, the same number Today's bubble and Chats' Unread pill show.
 * Content fades out under the bar instead of showing through the navigation bar area (the iOS 26
 * scroll edge effect, as a plain gradient). Tapping the current tab again scrolls it to the top
 * (`useScrollToTop` in each tab), as on iOS.
 */
function PlayfulTabBar({ state, emitter, navigateToTab }: TabBarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const unread = useUnreadChats();

  const open = (key: string, focused: boolean) => {
    // Always emitted: on the current tab it is the "back to the top" tap.
    const event = emitter.emit({ type: 'tabPress', target: key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigateToTab(key);
  };

  const tabs = state.routes.map((route, index) => ({ route, focused: state.index === index }));
  const find = tabs.find(({ route }) => route.name === 'find');
  const bottom = insets.bottom + space.md;

  // The same views on every switch: only the old and new tab's capsule change.
  return (
    <>
      <LinearGradient
        colors={playful.groundFade}
        pointerEvents="none"
        style={[styles.fade, { height: bottom + BAR + FADE_ABOVE }]}
      />
      <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
        <Floating style={styles.pill}>
          {tabs
            .filter(({ route }) => route.name !== 'find')
            .map(({ route, focused }) => {
              const label = t(`tabs.${route.name === 'index' ? 'home' : route.name}`);
              const icon = ICONS[route.name] ?? ICONS.index;
              const count = route.name === 'chat' ? unread : 0;
              return (
                <TabItem
                  key={route.key}
                  routeKey={route.key}
                  label={label}
                  icon={focused ? icon.on : icon.off}
                  focused={focused}
                  count={count}
                  a11yLabel={count > 0 ? t('a11y.unreadTab', { label, count }) : label}
                  onOpen={open}
                />
              );
            })}
        </Floating>

        {find ? (
          <Floating style={styles.round}>
            <PressableScale
              style={styles.roundPress}
              scaleTo={0.92}
              dimOnPress={false}
              accessibilityRole="tab"
              accessibilityLabel={t('tabs.find')}
              accessibilityState={{ selected: find.focused }}
              onPress={() => open(find.route.key, find.focused)}>
              {/* Never flattened: Android drops the corners of a view that gains its fill later. */}
              <View collapsable={false} style={[styles.roundInner, find.focused && styles.on]}>
                <SFIcon ios="magnifyingglass" icon="search" size={24} color={find.focused ? playful.chipOnText : playful.ink} />
              </View>
            </PressableScale>
          </Floating>
        ) : null}
      </View>
    </>
  );
}

/** One tab in the pill; memo, so a switch re-renders only the two tabs whose state changed. */
const TabItem = memo(function TabItem({
  routeKey,
  label,
  icon,
  focused,
  count,
  a11yLabel,
  onOpen,
}: {
  routeKey: string;
  label: string;
  icon: Pick<Icon, 'ios' | 'icon'>;
  focused: boolean;
  count: number;
  a11yLabel: string;
  onOpen: (key: string, focused: boolean) => void;
}) {
  const tint = focused ? playful.chipOnText : playful.tabOff;
  return (
    <PressableScale
      style={[styles.item, focused && styles.on]}
      scaleTo={0.94}
      dimOnPress={false}
      accessibilityRole="tab"
      accessibilityLabel={a11yLabel}
      accessibilityState={{ selected: focused }}
      onPress={() => onOpen(routeKey, focused)}>
      <View>
        <SFIcon {...icon} size={24} color={tint} />
        {count > 0 ? (
          <View style={styles.badge}>
            <Txt style={styles.badgeText} maxFontSizeMultiplier={1.1}>
              {badgeText(count)}
            </Txt>
          </View>
        ) : null}
      </View>
      <Txt variant="tiny" color={tint} style={styles.label} maxFontSizeMultiplier={1.2} lines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
        {label}
      </Txt>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  wrap: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 2,
  },
  // The prototype's soft shadow: iOS draws it; Android uses a low elevation (the bar sits above all).
  floating: {
    borderRadius: BAR / 2,
    backgroundColor: playful.bar,
    shadowColor: '#281E14',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  pill: {
    flex: 1,
    height: BAR,
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
  on: { backgroundColor: playful.chipOn },
  label: { fontWeight: '700' },
  round: { width: BAR, height: BAR },
  roundPress: { flex: 1, padding: space.xs },
  roundInner: { flex: 1, borderRadius: (BAR - space.sm) / 2, alignItems: 'center', justifyContent: 'center' },
  // The count of chats waiting, in the same red as Chats' Unread pill, ringed in the bar's white.
  badge: {
    position: 'absolute',
    top: -6,
    left: 14,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: playful.card,
    backgroundColor: playful.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 11, lineHeight: 13, fontWeight: '800', color: colors.white },
});
