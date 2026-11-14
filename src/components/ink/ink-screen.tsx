import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassBar, useScrolledPast } from '@/components/ui/glass';
import { Screen } from '@/components/ui/screen';
import { ink, inkGutter } from '@/theme/ink';

import { InkText } from './ink-text';

export interface InkScreenProps {
  /** The serif title at the top; it moves into the bar once scrolled under it. */
  title: string;
  /** One short line under the title. */
  subtitle?: string;
  /** The bar's right side (a round glass button). */
  right?: React.ReactNode;
  /** Pinned at the bottom over the ground: the screen's one pill (and a quiet way out). */
  footer?: React.ReactNode;
  /** Sheets and other overlays, outside the scroll. */
  overlays?: React.ReactNode;
  children: React.ReactNode;
}

/** Room the content leaves under itself for a pinned footer (a 56 pt pill and its margins). */
const FOOTER_ROOM = 96;

/**
 * The frame of an Ink screen (design-ink §2): the night ground, the glass bar with back, a large
 * serif title that hands over to the bar on scroll, the content in the 20 pt gutter, and an optional
 * footer pinned over the ground so cards scrolling under it never show through its edges.
 */
export function InkScreen({ title, subtitle, right, footer, overlays, children }: InkScreenProps) {
  const insets = useSafeAreaInsets();
  const { scrolled, onScroll } = useScrolledPast(44);
  return (
    <Screen background={ink.ground}>
      <GlassBar title={title} scrolled={scrolled} right={right} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: (footer ? FOOTER_ROOM : 24) + insets.bottom }}>
        <View style={styles.head}>
          <InkText variant="display">{title}</InkText>
          {subtitle ? <InkText variant="sub">{subtitle}</InkText> : null}
        </View>
        {children}
      </ScrollView>
      {footer ? <View style={[styles.foot, { paddingBottom: insets.bottom + 12 }]}>{footer}</View> : null}
      {overlays}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { marginTop: 4, marginBottom: 18, marginHorizontal: inkGutter, gap: 2 },
  foot: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: inkGutter, paddingTop: 8, gap: 4, backgroundColor: ink.ground },
});
