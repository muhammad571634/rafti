import { Text, TextProps } from 'react-native';

import { titleFit } from '@/lib/title-fit';
import { inkEm, inkType, type InkRole } from '@/theme/ink';

const SERIF: ReadonlySet<InkRole> = new Set(['display', 'title', 'card', 'cardSmall', 'numeral', 'numeralMid', 'numeralSmall']);

export interface InkTextProps extends TextProps {
  /** A type role from `inkType`; screens never set sizes of their own. */
  variant?: InkRole;
  color?: string;
  center?: boolean;
  /** `numberOfLines` with an ellipsis. */
  lines?: number;
}

/**
 * The Ink text primitive. Serif roles scale with Dynamic Type up to 1.6× (polish §1: display sizes
 * only); the system roles scale freely. A screen title is a header for VoiceOver.
 */
export function InkText({ variant = 'body', color, center, lines, style, children, ...rest }: InkTextProps) {
  const serif = SERIF.has(variant);
  const fit = lines === undefined && (variant === 'display' || variant === 'title') ? titleFit(children) : {};
  return (
    <Text
      numberOfLines={lines ?? fit.numberOfLines}
      adjustsFontSizeToFit={fit.adjustsFontSizeToFit}
      minimumFontScale={fit.minimumFontScale}
      ellipsizeMode={lines ? 'tail' : undefined}
      maxFontSizeMultiplier={serif ? 1.6 : undefined}
      // Long words hyphenate where the phone's hyphenator knows the language; one long word shrinks (`titleFit`).
      android_hyphenationFrequency={serif ? 'full' : undefined}
      accessibilityRole={variant === 'display' ? 'header' : undefined}
      style={[inkType[variant], color ? { color } : null, center ? { textAlign: 'center' } : null, style]}
      {...rest}>
      {children}
    </Text>
  );
}

/** The italic, coloured words inside a serif `InkText` ("New chapter: *the race*"). */
export function InkEm({ color, children }: { color: string; children: React.ReactNode }) {
  return <Text style={inkEm(color)}>{children}</Text>;
}
