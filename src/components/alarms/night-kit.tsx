import { Ionicons } from '@expo/vector-icons';
import type { TFunction } from 'i18next';
import { StyleSheet, View } from 'react-native';

import { PressableScale, Txt } from '@/components/ui';
import { sleepColors as night } from '@/theme';

/**
 * The parts the night screens share (Bedtime, Alarms, the alarm editor; owner-approved prototypes
 * 0z137 and 0z170): a face to pick who, a round -/+ button, and "in 8 h 30 min".
 */

/** A face in a "who" row: the picked one sits in an apricot ring. */
export const FACE_ON = 84;
export const FACE = 56;
/** The ring's padding and border around a face; its radius is set in numbers (Android draws 999 square). */
const RING_PAD = 3;
const RING_BORDER = 3;

/**
 * One face to pick. `steady` keeps the ring's room on every face (all faces one size), so picking
 * one never moves the row under the finger.
 */
export function NightFace({
  name,
  on,
  onPress,
  size,
  steady,
  children,
}: {
  name: string;
  on: boolean;
  onPress: () => void;
  /** The face's size inside the ring. */
  size: number;
  steady?: boolean;
  children: React.ReactNode;
}) {
  const ringed = on || steady;
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={name} style={styles.face}>
      <View
        style={[
          styles.faceRing,
          ringed && styles.faceRingBorder,
          ringed && !on && styles.faceRingIdle,
          { borderRadius: (size + RING_PAD * 2 + (ringed ? RING_BORDER * 2 : 0)) / 2 },
        ]}>
        {children}
      </View>
      <Txt style={[styles.faceName, on && styles.faceNameOn]} lines={1} maxFontSizeMultiplier={1.2}>
        {name}
      </Txt>
    </PressableScale>
  );
}

/** A round 44pt button on the navy: -/+ beside a big number. */
export function NightRound({ icon, label, onPress, size = 44 }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void; size?: number }) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6} style={[styles.round, { width: size, height: size, borderRadius: size / 2 }]}>
      <Ionicons name={icon} size={22} color={night.text} />
    </PressableScale>
  );
}

/** "in 8 h 30 min" (or "in 12 min") until a ring that is `ms` away. */
export function untilText(t: TFunction, ms: number) {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  const h = Math.floor(minutes / 60);
  return h ? t('alarms.inTime', { h, m: String(minutes % 60).padStart(2, '0') }) : t('alarms.inMinutes', { m: minutes });
}

const styles = StyleSheet.create({
  face: { alignItems: 'center', gap: 6, minWidth: FACE },
  faceRing: { padding: RING_PAD },
  faceRingBorder: { borderWidth: RING_BORDER, borderColor: night.primary },
  faceRingIdle: { borderColor: 'transparent', opacity: 0.75 },
  faceName: { fontSize: 13, color: night.textSecondary, maxWidth: FACE_ON, textAlign: 'center' },
  faceNameOn: { fontWeight: '700', color: night.text },
  round: { backgroundColor: night.well, alignItems: 'center', justifyContent: 'center' },
});
