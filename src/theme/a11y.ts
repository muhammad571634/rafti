import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/**
 * iOS Settings → Accessibility → Display & Text Size → Reduce Transparency (HIG Color, Dark Mode: check
 * the interface with it on). While it is on, see-through glass over photos turns solid, so words on it
 * never depend on the picture behind. Android has no such setting; it stays false there.
 */
export function useReduceTransparency() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let live = true;
    void AccessibilityInfo.isReduceTransparencyEnabled().then((v) => live && setOn(v));
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setOn);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return on;
}

/** The solid stand-in for glass over a photo while Reduce Transparency is on: the elevated night tone. */
export const SOLID_GLASS = '#1F1F2B';
