import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

/**
 * The reference call and settings screens sit on a heavily blurred copy of the
 * character's portrait. Oversized so the blur never shows soft edges.
 */
export function BlurBackdrop({
  source,
  dim = 0.3,
  blur = 40,
  overlay,
}: {
  source?: string | number;
  /** Strength of the default dark scrim. */
  dim?: number;
  blur?: number;
  /** Replaces the dark scrim, e.g. a pale wash for light screens. */
  overlay?: string;
}) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {source != null ? (
        <Image
          source={typeof source === 'string' ? { uri: source } : source}
          style={[StyleSheet.absoluteFill, styles.oversize]}
          contentFit="cover"
          blurRadius={blur}
        />
      ) : null}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: overlay ?? `rgba(24,28,36,${dim})` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  oversize: { transform: [{ scale: 1.35 }] },
});
