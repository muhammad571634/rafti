import Svg, { Circle, G, Path } from 'react-native-svg';

export type TabGlyphName = 'home' | 'chats' | 'us' | 'find';

/**
 * The tab bar's icons where SF Symbols may not be drawn (Android, web): our own line icons in the
 * manner of house, bubble.left.and.bubble.right, heart and magnifyingglass, a line and a filled twin
 * (owner, 2026-11-09: the stock Ionicons looked generic next to iOS). Apple's licence keeps SF
 * Symbols on Apple's platforms, so iPhone draws the real ones (`_layout.ios.tsx`) and these are drawn
 * here, not copied: a 24-point grid, round joins, a 1.8 line, like the symbols' regular weight.
 * `bg` is the colour behind the icon: the front bubble cuts the back one in it.
 */
export function TabGlyph({ name, filled, color, bg, size = 26 }: { name: TabGlyphName; filled: boolean; color: string; bg: string; size?: number }) {
  const line = { stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const shape = filled ? { fill: color } : { ...line, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'home' ? <Path d={HOUSE} {...shape} /> : null}
      {name === 'chats' ? (
        <G transform="translate(0 1.6)">
          <Path d={BACK_BUBBLE} {...shape} />
          {/* The front bubble covers the back one: a line icon fills it with the ground, a filled one rings it in the ground. */}
          {filled ? <Path d={FRONT_BUBBLE} fill={color} stroke={bg} strokeWidth={1.6} strokeLinejoin="round" /> : <Path d={FRONT_BUBBLE} {...line} fill={bg} />}
        </G>
      ) : null}
      {name === 'us' ? <Path d={HEART} {...shape} /> : null}
      {name === 'find' ? (
        <G {...line} fill="none" strokeWidth={filled ? 2.4 : 2}>
          <Circle cx={10.5} cy={10.5} r={6.4} />
          <Path d="M15.3 15.3 20.4 20.4" />
        </G>
      ) : null}
    </Svg>
  );
}

/** A house: a roof meeting walls in rounded corners, the door a notch at the bottom. */
const HOUSE =
  'M11.35 3.6a1 1 0 0 1 1.3 0l7.6 6.45a1.2 1.2 0 0 1 .42.9v8.55A1.5 1.5 0 0 1 19.17 21H14.6v-4.6a1.1 1.1 0 0 0-1.1-1.1h-3a1.1 1.1 0 0 0-1.1 1.1V21H4.83a1.5 1.5 0 0 1-1.5-1.5v-8.55a1.2 1.2 0 0 1 .42-.9z';
/** The other one's bubble, up and to the right, its tail on the right. */
const BACK_BUBBLE = 'M9.6 4.6A2.6 2.6 0 0 1 12.2 2h6.2A2.6 2.6 0 0 1 21 4.6v4a2.6 2.6 0 0 1-2.6 2.6h-.2v2.3l-2.7-2.3h-3.3a2.6 2.6 0 0 1-2.6-2.6z';
/** Your bubble, down and to the left, in front, its tail on the left. */
const FRONT_BUBBLE = 'M3 9.4A2.6 2.6 0 0 1 5.6 6.8h7A2.6 2.6 0 0 1 15.2 9.4v5a2.6 2.6 0 0 1-2.6 2.6H8.7l-3 2.6V17h-.1A2.6 2.6 0 0 1 3 14.4z';
/** A heart, two round lobes meeting in a soft point. */
const HEART = 'M12 20.4s-7.6-4.5-9.3-9.4C1.5 7.5 3.7 4.4 7.1 4.4c2 0 3.6 1.1 4.9 2.9 1.3-1.8 2.9-2.9 4.9-2.9 3.4 0 5.6 3.1 4.4 6.6-1.7 4.9-9.3 9.4-9.3 9.4z';
