import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextProps, type TextStyle } from 'react-native';

import { breaksMidWord, nextWordScale, titleFit } from '@/lib/title-fit';
import { inkEm, inkType, type InkRole } from '@/theme/ink';

const SERIF: ReadonlySet<InkRole> = new Set(['display', 'title', 'card', 'cardSmall', 'numeral', 'numeralMid', 'numeralSmall']);
const FIGURES: ReadonlySet<InkRole> = new Set(['figure', 'figureLarge', 'figureSmall', 'figureThin', 'figureThinUnit']);

export interface InkTextProps extends TextProps {
  /** A type role from `inkType`; screens never set sizes of their own. */
  variant?: InkRole;
  color?: string;
  center?: boolean;
  /** `numberOfLines` with an ellipsis. */
  lines?: number;
  /**
   * Shrink a little rather than break a word across lines ("Regne" / "rische" at large text sizes).
   * On by default for the serif roles; pass it for a narrow system label (a seat, a tile caption).
   */
  wordSafe?: boolean;
}

/**
 * The Ink text primitive. Serif roles scale with Dynamic Type up to 1.6× (polish §1: display sizes
 * only), large card/widget figures scale up to 1.4× so fixed-height widgets never overflow, and all
 * system reading roles scale freely. A screen title is a header for VoiceOver.
 */
export function InkText({ variant = 'body', color, center, lines, style, children, wordSafe, onTextLayout, ...rest }: InkTextProps) {
  const serif = SERIF.has(variant);
  const figure = FIGURES.has(variant);
  const safe = wordSafe ?? serif;
  // 1 until a layout shows a word split across lines, then a step smaller each layout (to a floor).
  const [scale, setScale] = useState(1);
  const text = typeof children === 'string' ? children : undefined;
  useEffect(() => setScale(1), [text]);
  const base = StyleSheet.flatten([inkType[variant], style]) as TextStyle;
  const shrunk = scale < 1 && base.fontSize ? { fontSize: base.fontSize * scale, lineHeight: base.lineHeight ? base.lineHeight * scale : undefined } : null;
  const fit = lines === undefined && (variant === 'display' || variant === 'title') ? titleFit(children) : {};
  return (
    <Text
      numberOfLines={lines ?? fit.numberOfLines}
      adjustsFontSizeToFit={fit.adjustsFontSizeToFit}
      minimumFontScale={fit.minimumFontScale}
      ellipsizeMode={lines ? 'tail' : undefined}
      maxFontSizeMultiplier={serif ? 1.6 : figure ? 1.4 : undefined}
      // Long words hyphenate where the phone's hyphenator knows the language; one long word shrinks (`titleFit`).
      android_hyphenationFrequency={serif ? 'full' : undefined}
      accessibilityRole={variant === 'display' ? 'header' : undefined}
      style={[inkType[variant], color ? { color } : null, center ? { textAlign: 'center' } : null, style, shrunk]}
      onTextLayout={
        safe
          ? (e) => {
              onTextLayout?.(e);
              if (!breaksMidWord(e.nativeEvent.lines.map((line) => line.text))) return;
              const next = nextWordScale(scale);
              if (next !== null) setScale(next);
            }
          : onTextLayout
      }
      {...rest}>
      {children}
    </Text>
  );
}

/** The italic, coloured words inside a serif `InkText` ("New chapter: *the race*"). */
export function InkEm({ color, children }: { color: string; children: React.ReactNode }) {
  return <Text style={inkEm(color)}>{children}</Text>;
}
