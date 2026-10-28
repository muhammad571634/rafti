import { BlurTargetView, BlurView } from 'expo-blur';
import { Redirect, Tabs } from 'expo-router';
import { createRef, useCallback, useRef, type ReactNode, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View, type StyleProp, type ViewInstance, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale, SFIcon, Txt } from '@/components/ui';
import { TabBlurTarget } from '@/hooks/use-tab-blur-target';
import { useTabsGate, useUnreadTotal } from '@/hooks/use-tabs-gate';
import { aurora, colors, isDark, radius, shadows, space } from '@/theme';

/** expo-router ships its own bottom-tab types; derive them from the component. */
type TabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];
type Icon = React.ComponentProps<typeof SFIcon>;
type BlurTarget = RefObject<ViewInstance | null>;

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

/** Screens that render their own BlurTargetView with `useTabBlurTarget()`'s ref. */
const OWN_TARGET = new Set(['chat']);

/** The bar's height; `TAB_BAR_HEIGHT` leaves room for it. */
const BAR = 62;

/**
 * Android and web. iOS uses the system tab bar instead (`_layout.ios.tsx`), Liquid Glass on
 * iOS 26 and later; this one draws the same layout.
 */
export default function TabsLayout() {
  const gate = useTabsGate();

  // Android blurs only what sits in a BlurTargetView, so every tab screen gets one, and the bar
  // blurs the current screen's. One ref per route key, made on first ask.
  const targets = useRef(new Map<string, BlurTarget>()).current;
  const targetFor = useCallback(
    (key: string) => {
      let ref = targets.get(key);
      if (!ref) {
        ref = createRef<ViewInstance>();
        targets.set(key, ref);
      }
      return ref;
    },
    [targets],
  );

  // Saved data decides whether this is a first launch, so wait for it.
  if (gate === 'loading') return null;
  if (gate === 'onboarding') return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      screenLayout={({ route, children }) => (
        <TabBlurTarget.Provider value={targetFor(route.key)}>
          {OWN_TARGET.has(route.name) ? (
            children
          ) : (
            <BlurTargetView ref={targetFor(route.key)} style={styles.screen}>
              {children}
            </BlurTargetView>
          )}
        </TabBlurTarget.Provider>
      )}
      tabBar={(props) => <GlassTabBar {...props} targetFor={targetFor} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="us" />
      <Tabs.Screen name="find" />
    </Tabs>
  );
}

/**
 * iOS blurs in the system compositor. Android has no system material: a live blur there redraws
 * the whole screen into a full-size layer for each glass shape on every scroll frame (atrace on a
 * Galaxy A51: two 1080x2400 BlurView layers per frame), so it gets a denser frosted fill instead.
 */
const LIVE_BLUR = Platform.OS === 'ios';

/** Frosted glass over the current screen: a blur (iOS) or a dense fill (Android), and a bright top rim. */
function Glass({ target, style, children }: { target: BlurTarget; style: StyleProp<ViewStyle>; children: ReactNode }) {
  return (
    <View style={[styles.glass, style]}>
      <View style={[StyleSheet.absoluteFill, styles.clip]} pointerEvents="none">
        {LIVE_BLUR ? (
          <BlurView
            intensity={60}
            tint={isDark ? 'dark' : 'light'}
            blurMethod="dimezisBlurView"
            blurReductionFactor={4}
            blurTarget={target}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <View style={[StyleSheet.absoluteFill, LIVE_BLUR ? styles.fill : styles.frost]} />
      </View>
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
function GlassTabBar({ state, emitter, navigateToTab, targetFor }: TabBarProps & { targetFor: (key: string) => BlurTarget }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const unread = useUnreadTotal();

  const open = (key: string, focused: boolean) => {
    const event = emitter.emit({ type: 'tabPress', target: key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigateToTab(key);
  };

  const tabs = state.routes.map((route, index) => ({ route, focused: state.index === index }));
  const find = tabs.find(({ route }) => route.name === 'find');
  const currentKey = state.routes[state.index].key;
  const target = targetFor(currentKey);

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + space.md }]}>
      {/* Keyed by the current screen: the blur binds to its target when it mounts. */}
      <Glass key={`pill-${currentKey}`} target={target} style={styles.pill}>
        {tabs
          .filter(({ route }) => route.name !== 'find')
          .map(({ route, focused }) => {
            const label = t(`tabs.${route.name === 'index' ? 'home' : route.name}`);
            const icon = ICONS[route.name] ?? ICONS.index;
            const tint = focused ? colors.primary : colors.text;
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
                onPress={() => open(route.key, focused)}>
                <View>
                  <SFIcon {...(focused ? icon.on : icon.off)} size={24} color={tint} />
                  {hasUnread ? <View style={styles.dot} /> : null}
                </View>
                <Txt
                  variant="tiny"
                  color={tint}
                  style={styles.label}
                  maxFontSizeMultiplier={1.2}
                  lines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}>
                  {label}
                </Txt>
              </PressableScale>
            );
          })}
      </Glass>

      {find ? (
        <Glass key={`find-${currentKey}`} target={target} style={styles.round}>
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

const styles = StyleSheet.create({
  screen: { flex: 1 },
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
  // Over the blur, a thin fill keeps the bar's own labels crisp whatever scrolls beneath.
  fill: { backgroundColor: isDark ? 'rgba(30,30,32,0.45)' : 'rgba(255,255,255,0.5)' },
  // Without the blur, a denser fill keeps the labels crisp over whatever scrolls beneath.
  frost: { backgroundColor: isDark ? 'rgba(30,30,32,0.86)' : 'rgba(255,255,255,0.84)' },
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
