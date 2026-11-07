import { Redirect, Tabs } from 'expo-router';
import { memo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale, SFIcon, Txt } from '@/components/ui';
import { useTabsGate, useUnreadTotal } from '@/hooks/use-tabs-gate';
import { aurora, colors, isDark, radius, shadows, space } from '@/theme';

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
 * Frosted glass: a dense fill and a bright top rim. No live blur here: on Android it redraws the
 * whole screen into a full-size layer for each glass shape on every frame (atrace on a Galaxy A51:
 * two 1080x2400 BlurView layers per frame), and iPhone has the system tab bar (`_layout.ios.tsx`).
 * So no screen needs a BlurTargetView for the bar either (Chats keeps its own, for its menus).
 */
function Glass({ style, children }: { style: StyleProp<ViewStyle>; children: ReactNode }) {
  return (
    <View style={[styles.glass, style]}>
      <View style={[StyleSheet.absoluteFill, styles.clip, styles.frost]} pointerEvents="none" />
      {children}
    </View>
  );
}

/**
 * A floating frosted pill holding Today, Chats and Us, with Find as its own round button beside
 * it, the way iOS sets the search tab apart (approved prototype
 * https://claude.ai/artifact/WTWWPXiX17USrgcgYAdRQg). As on iOS, the current tab takes the tint
 * (icon filled) inside a soft capsule and the rest stay in the label colour; unread chats show
 * one small dot.
 */
function GlassTabBar({ state, emitter, navigateToTab }: TabBarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const unread = useUnreadTotal();

  const open = (key: string, focused: boolean) => {
    const event = emitter.emit({ type: 'tabPress', target: key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigateToTab(key);
  };

  const tabs = state.routes.map((route, index) => ({ route, focused: state.index === index }));
  const find = tabs.find(({ route }) => route.name === 'find');

  // The same views on every switch: only the old and new tab's tint and capsule change. (It used to
  // be keyed by the current screen, so each tap rebuilt the whole bar for a blur Android never drew.)
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + space.md }]}>
      <Glass style={styles.pill}>
        {tabs
          .filter(({ route }) => route.name !== 'find')
          .map(({ route, focused }) => {
            const label = t(`tabs.${route.name === 'index' ? 'home' : route.name}`);
            const icon = ICONS[route.name] ?? ICONS.index;
            const tint = focused ? colors.primary : colors.text;
            const hasUnread = route.name === 'chat' && unread > 0;
            return (
              <TabItem
                key={route.key}
                routeKey={route.key}
                label={label}
                icon={focused ? icon.on : icon.off}
                tint={tint}
                focused={focused}
                unread={hasUnread ? unread : 0}
                a11yLabel={hasUnread ? t('a11y.unreadTab', { label, count: unread }) : label}
                onOpen={open}
              />
            );
          })}
      </Glass>

      {find ? (
        <Glass style={styles.round}>
          <PressableScale
            style={styles.roundPress}
            scaleTo={0.92}
            dimOnPress={false}
            accessibilityRole="tab"
            accessibilityLabel={t('tabs.find')}
            accessibilityState={{ selected: find.focused }}
            onPress={() => open(find.route.key, find.focused)}>
            {/* Never flattened: Android drops the corners of a view that gains its fill later. */}
            <View collapsable={false} style={[styles.roundInner, find.focused && styles.itemOn]}>
              <SFIcon ios="magnifyingglass" icon="search" size={24} color={find.focused ? colors.primary : colors.text} />
            </View>
          </PressableScale>
        </Glass>
      ) : null}
    </View>
  );
}

/** One tab in the pill; memo, so a switch re-renders only the two tabs whose state changed. */
const TabItem = memo(function TabItem({
  routeKey,
  label,
  icon,
  tint,
  focused,
  unread,
  a11yLabel,
  onOpen,
}: {
  routeKey: string;
  label: string;
  icon: Pick<Icon, 'ios' | 'icon'>;
  tint: string;
  focused: boolean;
  unread: number;
  a11yLabel: string;
  onOpen: (key: string, focused: boolean) => void;
}) {
  return (
    <PressableScale
      style={[styles.item, focused && styles.itemOn]}
      scaleTo={0.94}
      dimOnPress={false}
      accessibilityRole="tab"
      accessibilityLabel={a11yLabel}
      accessibilityState={{ selected: focused }}
      onPress={() => onOpen(routeKey, focused)}>
      <View>
        <SFIcon {...icon} size={24} color={tint} />
        {unread > 0 ? <View style={styles.dot} /> : null}
      </View>
      <Txt variant="tiny" color={tint} style={styles.label} maxFontSizeMultiplier={1.2} lines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
        {label}
      </Txt>
    </PressableScale>
  );
});

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
    borderRadius: BAR / 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: aurora.glassEdge,
    borderTopColor: aurora.glassRim,
    ...shadows.glass,
  },
  clip: { borderRadius: BAR / 2, overflow: 'hidden' },
  // A dense fill keeps the labels crisp over whatever scrolls beneath.
  frost: { backgroundColor: isDark ? 'rgba(30,30,32,0.9)' : 'rgba(255,255,255,0.9)' },
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
  itemOn: { backgroundColor: aurora.glassOn },
  label: { fontWeight: '700' },
  round: { width: BAR, height: BAR },
  roundPress: { flex: 1, padding: space.xs },
  roundInner: { flex: 1, borderRadius: (BAR - space.sm) / 2, alignItems: 'center', justifyContent: 'center' },
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
