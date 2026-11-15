import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, Tabs } from 'expo-router';
import { memo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InkText } from '@/components/ink';
import { badgeText, useTabsGate, useUnreadChats } from '@/hooks/use-tabs-gate';
import { colors, space, systemGround } from '@/theme';
import { ink, inkGlass, inkRadius } from '@/theme/ink';

/** expo-router ships its own bottom-tab types; derive them from the component. */
type TabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

/**
 * Each tab's symbol, an outline and its filled twin while current (owner, 2026-11-16: exactly the
 * prototype's, `docs/prototypes/tab-bar.html`): house, two bubbles, heart; search stays one shape.
 */
type Glyph = { on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap };
const GLYPHS: Record<string, Glyph> = {
  index: { on: 'home', off: 'home-outline' },
  chat: { on: 'chatbubbles', off: 'chatbubbles-outline' },
  us: { on: 'heart', off: 'heart-outline' },
};
const ICON = 24;

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

  // Inactive tabs stay detached (the default). Keeping them attached as see-through layers with a
  // 180 ms fade-in was tried (0z134) and measured worse on a Galaxy A51: the 90th percentile frame of
  // a switch went from 65 to 133-150 ms, and the 25-40 ms mount on the switch stayed.
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
 * A floating shape of dark Liquid Glass (owner's pick A, 2026-11-16, `docs/prototypes/tab-bar.html`): a
 * near-opaque wash, a hairline rim and a lit top edge; clean, no shadow and no sheen (owner). No live blur: on Android it
 * redraws the whole screen into a full-size layer for each glass shape on every frame (atrace on a Galaxy
 * A51), and iPhone has the system tab bar (`_layout.ios.tsx`), which is real Liquid Glass.
 */
function Floating({ style, children }: { style: StyleProp<ViewStyle>; children: ReactNode }) {
  return (
    <View style={[styles.floating, style]}>
      <View style={styles.glass} pointerEvents="none">
        <LinearGradient colors={inkGlass.fill} locations={inkGlass.fillStops} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={TOP_LIGHT} locations={TOP_LIGHT_STOPS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.topLight} />
      </View>
      {children}
    </View>
  );
}

/** The lit top edge fades out toward the rounded ends instead of stopping short. */
const TOP_LIGHT = ['rgba(255,255,255,0)', inkGlass.topLight, inkGlass.topLight, 'rgba(255,255,255,0)'] as const;
const TOP_LIGHT_STOPS = [0.04, 0.3, 0.7, 0.96] as const;

/** The current tab's clear lens: a lighter glass inside the bar, rimmed, lit from the top. */
function Lens() {
  return <LinearGradient colors={inkGlass.lens} style={styles.lens} pointerEvents="none" />;
}

/**
 * The tab bar of the four-tab prototype (0z124) in dark Liquid Glass (owner's pick A, 2026-11-16): one
 * glass pill holding Today, Chats and Us, with Find as its own round glass button beside it, the way iOS
 * sets the search tab apart. The current tab sits in a clear lens with a white filled symbol and label;
 * the rest are outlines at 55 %, monochrome over colourful art (HIG Tab bars). Chats
 * carries the number of chats waiting, the same number Today's bubble and Chats' Unread pill show.
 * Content fades out under the bar instead of showing through the navigation bar area (the iOS 26
 * scroll edge effect, as a plain gradient). Tapping the current tab again scrolls it to the top
 * (`useScrollToTop` in each tab), as on iOS. A tab switches the moment it is tapped, with no press
 * animation: iOS and Material tab bars do not shrink, and the shrink redrew the whole window for
 * ~200 ms before the switch began (atrace, 0z134).
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
        colors={systemGround.groundFade}
        pointerEvents="none"
        style={[styles.fade, { height: bottom + BAR + FADE_ABOVE }]}
      />
      <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
        <Floating style={styles.pill}>
          {tabs
            .filter(({ route }) => route.name !== 'find')
            .map(({ route, focused }) => {
              const label = t(`tabs.${route.name === 'index' ? 'home' : route.name}`);
              const count = route.name === 'chat' ? unread : 0;
              return (
                <TabItem
                  key={route.key}
                  routeKey={route.key}
                  label={label}
                  glyph={GLYPHS[route.name] ?? GLYPHS.index}
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
            <Pressable
              style={styles.roundPress}
              accessibilityRole="tab"
              accessibilityLabel={t('tabs.find')}
              accessibilityState={{ selected: find.focused }}
              onPress={() => open(find.route.key, find.focused)}>
              {/* Never flattened: Android drops the corners of a view that gains its fill later. */}
              <View collapsable={false} style={styles.roundInner}>
                {find.focused ? <Lens /> : null}
                <Ionicons name="search" size={ICON} color={find.focused ? inkGlass.on : inkGlass.off} />
              </View>
            </Pressable>
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
  glyph,
  focused,
  count,
  a11yLabel,
  onOpen,
}: {
  routeKey: string;
  label: string;
  glyph: Glyph;
  focused: boolean;
  count: number;
  a11yLabel: string;
  onOpen: (key: string, focused: boolean) => void;
}) {
  const tint = focused ? inkGlass.on : inkGlass.off;
  return (
    <Pressable
      style={styles.item}
      accessibilityRole="tab"
      accessibilityLabel={a11yLabel}
      accessibilityState={{ selected: focused }}
      onPress={() => onOpen(routeKey, focused)}>
      {focused ? <Lens /> : null}
      <View>
        <Ionicons name={focused ? glyph.on : glyph.off} size={ICON} color={tint} />
        {count > 0 ? (
          <View style={styles.badge}>
            <InkText variant="caption" color={colors.white} maxFontSizeMultiplier={1.1}>
              {badgeText(count)}
            </InkText>
          </View>
        ) : null}
      </View>
      <InkText variant="caption" color={tint} maxFontSizeMultiplier={1.2} lines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
        {label}
      </InkText>
    </Pressable>
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
  // No shadow (owner, 2026-11-16: clean); the glass's own rim and top light set it off the content.
  floating: {
    borderRadius: inkRadius.pill,
    borderCurve: 'continuous',
    backgroundColor: inkGlass.flat,
  },
  // The glass itself, clipped to the pill.
  glass: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: inkRadius.pill,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: inkGlass.rim,
  },
  // The lit top edge; the glass clips it to the curve.
  topLight: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  lens: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: inkRadius.pill,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: inkGlass.lensRim,
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
    borderRadius: inkRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  round: { width: BAR, height: BAR },
  roundPress: { flex: 1, padding: space.xs },
  roundInner: { flex: 1, borderRadius: inkRadius.pill, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  // The count of chats waiting, in the same red as Chats' Unread chip, ringed in the bar's own colour.
  badge: {
    position: 'absolute',
    top: -6,
    left: 14,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: inkRadius.pill,
    borderWidth: 2,
    borderColor: inkGlass.flat,
    backgroundColor: ink.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
