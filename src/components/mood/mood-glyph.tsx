import { memo } from 'react';
import Svg, { Path } from 'react-native-svg';

import { bandCentre, bandColor, moodPath } from '@/lib/mood';

/**
 * A band's shape, still, in its colour: the mood card in a chat and the Today row. Drawn once with
 * SVG (no clock, no canvas), so a chat full of check-ins costs nothing per frame.
 */
export const MoodGlyph = memo(function MoodGlyph({ band, size }: { band: number; size: number }) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} accessible={false}>
      <Path d={moodPath(size, bandCentre(band), 0.4, 96)} fill={bandColor(band)} />
    </Svg>
  );
});
