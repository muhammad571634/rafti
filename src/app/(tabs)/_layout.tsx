import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, Tabs } from 'expo-router';
import { memo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { InkText } from '@/components/ink';
import { badgeText, useTabsGate, useUnreadChats } from '@/hooks/use-tabs-gate';
import { colors, space } from '@/theme';
import { ink, inkGlass } from '@/theme/ink';

/** expo-router ships its own bottom-tab types; derive them from the component. */
type TabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];
type TabRouteName = 'index' | 'chat' | 'us' | 'find';

const ICON = 23;
/** The bar's height; `TAB_BAR_HEIGHT` leaves room for it. */
const BAR = 64;
const ITEM_H = BAR - 8;
/** How far above the bar the content starts to fade. */
const FADE_ABOVE = 28;

const PEACH_LENS = ['rgba(235,173,132,0.28)', 'rgba(235,173,132,0.13)'] as const;
const PEACH_LENS_RIM = 'rgba(235,173,132,0.48)';
const BAR_FILL = ['#282832', '#17171E', '#121218'] as const;
const BAR_STOPS = [0, 0.52, 1] as const;

/**
 * Android and web. iOS uses the system tab bar instead (`_layout.ios.tsx`), Liquid Glass on
 * iOS 26 and later; this one draws the approved unified 4-tab Liquid Glass capsule.
 */
export default function TabsLayout() {
  const gate = useTabsGate();

  // Saved data decides whether this is a first launch, so wait for it.
  if (gate === 'loading') return null;
  if (gate === 'onboarding') return <Redirect href="/onboarding" />;

  // Inactive tabs stay detached (the default). Keeping them attached as see-through layers with a
  // 180 ms fade-in was tried (0z134) and measured worse on a Galaxy A51.
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
 * A floating shape of dark Liquid Glass (approved Variant A, 2026-11-21): a near-opaque wash, a
 * hairline rim and a lit top edge; clean, no shadow and no live blur so Galaxy A51 holds 60 fps.
 */
function Floating({ style, children }: { style: StyleProp<ViewStyle>; children: ReactNode }) {
  return (
    <View style={[styles.floating, style]}>
      <View style={styles.glass} pointerEvents="none">
        <LinearGradient colors={BAR_FILL} locations={BAR_STOPS} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={TOP_LIGHT} locations={TOP_LIGHT_STOPS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.topLight} />
      </View>
      {children}
    </View>
  );
}

/** The lit top edge fades out toward the rounded ends instead of stopping short. */
const TOP_LIGHT = ['rgba(255,255,255,0)', inkGlass.topLight, inkGlass.topLight, 'rgba(255,255,255,0)'] as const;
const TOP_LIGHT_STOPS = [0.04, 0.3, 0.7, 0.96] as const;

/** The current tab's warm brand-peach lens: soft top-to-bottom peach wash with a subtle peach rim. */
function Lens() {
  return <LinearGradient colors={PEACH_LENS} style={styles.lens} pointerEvents="none" />;
}

/**
 * Custom Apple Story & Sparkle vector icons (approved Variant A + Icon Pack 2, 2026-11-21):
 * - Today (`index`): dual 4-point sparkles
 * - Chats (`chat`): smooth rounded speech bubble with 3 dots
 * - Us (`us`): Apple heart
 * - Find (`find`): 2x2 rounded discovery grid
 */
function TabGlyph({ name, focused, color }: { name: TabRouteName; focused: boolean; color: string }) {
  if (name === 'index') {
    return focused ? (
      <Svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 2.8c.7 4.4 2.8 6.5 7.2 7.2-4.4.7-6.5 2.8-7.2 7.2-.7-4.4-2.8-6.5-7.2-7.2 4.4-.7 6.5-2.8 7.2-7.2z"
          fill={color}
        />
        <Path
          d="M18.6 15.8c.32 1.78 1.12 2.58 2.9 2.9-1.78.32-2.58 1.12-2.9 2.9-.32-1.78-1.12-2.58-2.9-2.9 1.78-.32 2.58-1.12 2.9-2.9z"
          fill={color}
        />
      </Svg>
    ) : (
      <Svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 3.5c.6 3.9 2.6 5.9 6.5 6.5-3.9.6-5.9 2.6-6.5 6.5-.6-3.9-2.6-5.9-6.5-6.5 3.9-.6 5.9-2.6 6.5-6.5z"
          stroke={color}
          strokeWidth={1.85}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M18.5 16.5c.25 1.5.95 2.2 2.5 2.5-1.55.3-2.25 1-2.5 2.5-.25-1.5-.95-2.2-2.5-2.5 1.55-.3 2.25-1 2.5-2.5z"
          stroke={color}
          strokeWidth={1.85}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  if (name === 'chat') {
    return focused ? (
      <Svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="none">
        <Path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12 3.8c-4.97 0-9 3.4-9 7.6 0 2.32 1.23 4.42 3.2 5.82l-1.15 2.75a.6.6 0 00.8.78l3.48-1.56c.86.2 1.76.31 2.67.31 4.97 0 9-3.4 9-7.6s-4.03-8.1-9-8.1zm-3.5 8.8a1.15 1.15 0 110-2.3 1.15 1.15 0 010 2.3zm3.5 0a1.15 1.15 0 110-2.3 1.15 1.15 0 010 2.3zm3.5 0a1.15 1.15 0 110-2.3 1.15 1.15 0 010 2.3z"
          fill={color}
        />
      </Svg>
    ) : (
      <Svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 4.2c-4.7 0-8.5 3.2-8.5 7.2 0 2.2 1.2 4.2 3.1 5.5L5.4 20l3.5-1.6c1 .25 2 .4 3.1.4 4.7 0 8.5-3.2 8.5-7.4S16.7 4.2 12 4.2z"
          stroke={color}
          strokeWidth={1.85}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx={8.5} cy={11.5} r={1.15} fill={color} />
        <Circle cx={12} cy={11.5} r={1.15} fill={color} />
        <Circle cx={15.5} cy={11.5} r={1.15} fill={color} />
      </Svg>
    );
  }

  if (name === 'us') {
    return focused ? (
      <Svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 20.8a.9.9 0 01-.52-.17C10.9 20.2 4 15.4 4 9.8A4.9 4.9 0 0112 6.1a4.9 4.9 0 018 3.7c0 5.6-6.9 10.4-7.48 10.83a.9.9 0 01-.52.17z"
          fill={color}
        />
      </Svg>
    ) : (
      <Svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 20.2s-7.5-4.5-7.5-10.3A4.4 4.4 0 0112 6.8a4.4 4.4 0 017.5 3.1c0 5.8-7.5 10.3-7.5 10.3z"
          stroke={color}
          strokeWidth={1.85}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  // find
  return focused ? (
    <Svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="none">
      <Rect x={3.5} y={3.5} width={7.5} height={7.5} rx={2.3} fill={color} />
      <Rect x={13} y={3.5} width={7.5} height={7.5} rx={2.3} fill={color} fillOpacity={0.65} />
      <Rect x={3.5} y={13} width={7.5} height={7.5} rx={2.3} fill={color} fillOpacity={0.65} />
      <Circle cx={16.75} cy={16.75} r={3.75} fill={color} />
    </Svg>
  ) : (
    <Svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={4} width={7} height={7} rx={2} stroke={color} strokeWidth={1.85} />
      <Rect x={13} y={4} width={7} height={7} rx={2} stroke={color} strokeWidth={1.85} />
      <Rect x={4} y={13} width={7} height={7} rx={2} stroke={color} strokeWidth={1.85} />
      <Path d="M16.5 13v7M13 16.5h7" stroke={color} strokeWidth={1.85} strokeLinecap="round" />
    </Svg>
  );
}

/**
 * Unified 4-tab dark Liquid Glass capsule (owner's pick Variant A + Apple Story & Sparkle icons,
 * 2026-11-21): Today, Chats, Us, and Find all share one balanced floating capsule with labels on
 * every tab and a warm Sigmazam brand-peach lens (`#EBAD84`) on the active tab.
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
  const bottom = insets.bottom + space.md;

  return (
    <>
      <LinearGradient
        colors={ink.groundFade}
        pointerEvents="none"
        style={[styles.fade, { height: bottom + BAR + FADE_ABOVE }]}
      />
      <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
        <Floating style={styles.pill}>
          {tabs.map(({ route, focused }) => {
            const name = (route.name as TabRouteName) || 'index';
            const label = t(`tabs.${name === 'index' ? 'home' : name}`);
            const count = name === 'chat' ? unread : 0;
            return (
              <TabItem
                key={route.key}
                routeKey={route.key}
                name={name}
                label={label}
                focused={focused}
                count={count}
                a11yLabel={count > 0 ? t('a11y.unreadTab', { label, count }) : label}
                onOpen={open}
              />
            );
          })}
        </Floating>
      </View>
    </>
  );
}

/** One tab in the unified 4-tab pill; memo so switching tabs re-renders only the old and new tab. */
const TabItem = memo(function TabItem({
  routeKey,
  name,
  label,
  focused,
  count,
  a11yLabel,
  onOpen,
}: {
  routeKey: string;
  name: TabRouteName;
  label: string;
  focused: boolean;
  count: number;
  a11yLabel: string;
  onOpen: (key: string, focused: boolean) => void;
}) {
  const tint = focused ? ink.accent : inkGlass.off;
  return (
    <Pressable
      style={styles.item}
      accessibilityRole="tab"
      accessibilityLabel={a11yLabel}
      accessibilityState={{ selected: focused }}
      onPress={() => onOpen(routeKey, focused)}>
      {focused ? <Lens /> : null}
      <View style={styles.iconBox}>
        <TabGlyph name={name} focused={focused} color={tint} />
        {count > 0 ? (
          <View style={styles.badge}>
            <InkText variant="caption" color={colors.white} maxFontSizeMultiplier={1.1} style={styles.badgeText}>
              {badgeText(count)}
            </InkText>
          </View>
        ) : null}
      </View>
      <InkText
        variant="caption"
        color={tint}
        maxFontSizeMultiplier={1.2}
        lines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        style={focused ? styles.labelOn : styles.labelOff}>
        {label}
      </InkText>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  wrap: {
    position: 'absolute',
    left: 18,
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  floating: {
    borderRadius: BAR / 2,
    borderCurve: 'continuous',
    backgroundColor: inkGlass.flat,
  },
  glass: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BAR / 2,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  topLight: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  lens: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: ITEM_H / 2,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PEACH_LENS_RIM,
  },
  pill: {
    flex: 1,
    height: BAR,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  item: {
    flex: 1,
    height: ITEM_H,
    borderRadius: ITEM_H / 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconBox: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  labelOn: { fontSize: 11, lineHeight: 13, fontWeight: '700' },
  labelOff: { fontSize: 11, lineHeight: 13, fontWeight: '600' },
  badge: {
    position: 'absolute',
    top: -5,
    right: -11,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#1A1A22',
    backgroundColor: ink.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10.5, lineHeight: 12, fontWeight: '700' },
});
