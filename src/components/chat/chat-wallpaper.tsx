import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { palette } from '@/theme';

/**
 * Faint seashells and otter paw prints scattered behind the message list, like the
 * reference chat wallpaper. Purely decorative and non-interactive.
 */
export function ChatWallpaper({ hidden }: { hidden?: boolean }) {
  if (hidden) return null;

  return (
    <View pointerEvents="none" style={styles.root}>
      <Shell size={120} style={styles.shellA} />
      <Shell size={72} color={palette.mint400} style={styles.shellB} />
      <Shell size={96} style={styles.shellC} />
      <Paw style={styles.pawA} />
      <Paw style={styles.pawB} />
      <Paw style={styles.pawC} />
      <Paw style={styles.pawD} />
    </View>
  );
}

/** A scallop shell: fan of ribs over a small hinge. */
function Shell({ size, color = palette.apricot300, style }: { size: number; color?: string; style: object }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" style={style}>
      <G fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M20 33 C8 30 3 20 6 12 C9 5 16 4 20 6 C24 4 31 5 34 12 C37 20 32 30 20 33 Z" />
        <Path d="M20 33 L20 8 M20 33 L12 9 M20 33 L28 9 M20 33 L7 16 M20 33 L33 16" />
        <Path d="M15 33 L14 37 L26 37 L25 33" />
      </G>
    </Svg>
  );
}

function Paw({ style }: { style: object }) {
  return (
    <Svg width={48} height={48} viewBox="0 0 40 40" style={style}>
      <G fill={palette.caramel300}>
        <Circle cx={20} cy={26} r={8} />
        <Circle cx={9} cy={16} r={4} />
        <Circle cx={16} cy={9} r={4} />
        <Circle cx={24} cy={9} r={4} />
        <Circle cx={31} cy={16} r={4} />
      </G>
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', opacity: 0.22 },
  shellA: { position: 'absolute', top: '30%', right: -24, transform: [{ rotate: '-14deg' }] },
  shellB: { position: 'absolute', top: '6%', right: '30%', transform: [{ rotate: '18deg' }] },
  shellC: { position: 'absolute', top: '72%', left: -18, transform: [{ rotate: '10deg' }] },
  pawA: { position: 'absolute', top: '12%', left: '8%', transform: [{ rotate: '-20deg' }] },
  pawB: { position: 'absolute', top: '50%', left: '16%', transform: [{ rotate: '12deg' }] },
  pawC: { position: 'absolute', top: '84%', right: '18%', transform: [{ rotate: '-8deg' }] },
  pawD: { position: 'absolute', top: '60%', right: '40%', transform: [{ rotate: '24deg' }] },
});
