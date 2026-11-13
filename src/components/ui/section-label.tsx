import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, space } from '@/theme';

import { Txt } from './text';

/**
 * A group label. `quiet` (default) names a section without shouting; `title` is a bold
 * heading in ink for the few sections that lead a screen (Home's Chats and Today);
 * `section` is the calm-cards section title (docs/design-style.md): h3 in ink.
 */
export function SectionLabel({
  title,
  right,
  tone = 'quiet',
  style,
}: {
  title: string;
  right?: React.ReactNode;
  tone?: 'quiet' | 'title' | 'section';
  style?: StyleProp<ViewStyle>;
}) {
  const heading = tone !== 'quiet';
  return (
    <View style={[styles.base, heading && styles.heading, tone === 'section' && styles.section, style]}>
      <Txt
        variant={tone === 'title' ? 'h2' : tone === 'section' ? 'h3' : 'smallStrong'}
        color={heading ? colors.text : colors.textMuted}
        accessibilityRole={heading ? 'header' : undefined}
        style={styles.title}>
        {title}
      </Txt>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingTop: space.xl,
    paddingBottom: space.xs,
  },
  heading: { paddingTop: space.xxl, paddingBottom: space.xs },
  section: { paddingTop: space.xl + 2, paddingBottom: space.xxs },
  title: { flex: 1 },
});
