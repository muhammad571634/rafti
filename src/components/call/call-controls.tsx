import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { PressableScale, Txt } from '@/components/ui';
import { colors, space, systemColors } from '@/theme';

/**
 * Mute, End and Speaker under a call (canvas "CallVoice" / "CallGroup", 2026-10-21): two glass
 * toggles that turn white when on, as iOS does, and the red hang-up between them. The mock has no
 * audio session yet, so mute and speaker only change state; real builds route them to expo-audio.
 */
export function CallControls({
  muted,
  speaker,
  onMute,
  onSpeaker,
  onEnd,
  bottom,
  hidden,
}: {
  muted: boolean;
  speaker: boolean;
  onMute: () => void;
  onSpeaker: () => void;
  onEnd: () => void;
  bottom: number;
  hidden?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View style={[styles.controls, { paddingBottom: bottom }, hidden && styles.hidden]}>
      <Toggle icon="mic-off" label={t('call.mute')} active={muted} onPress={onMute} />
      <View style={styles.control}>
        <View style={styles.slot}>
          <PressableScale
            style={styles.hangUp}
            onPress={onEnd}
            scaleTo={0.9}
            haptic
            accessibilityRole="button"
            accessibilityLabel={t('call.end')}>
            <MaterialCommunityIcons name="phone-hangup" size={32} color={colors.onMedia} />
          </PressableScale>
        </View>
        <Txt style={styles.label}>{t('call.end')}</Txt>
      </View>
      <Toggle icon="volume-high" label={t('call.speaker')} active={speaker} onPress={onSpeaker} />
    </View>
  );
}

function Toggle({
  icon,
  label,
  active,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.control}>
      <View style={styles.slot}>
        <PressableScale
          style={[callGlass.glass, styles.toggle, active && styles.toggleOn]}
          onPress={onPress}
          scaleTo={0.9}
          accessibilityRole="switch"
          accessibilityLabel={label}
          accessibilityState={{ checked: active }}
          aria-checked={active}>
          <Ionicons name={icon} size={26} color={active ? '#1C1C1E' : colors.onMedia} />
        </PressableScale>
      </View>
      <Txt style={styles.label}>{label}</Txt>
    </View>
  );
}

/** Glass on a call's blurred portrait: a see-through white fill with a bright rim. */
export const callGlass = StyleSheet.create({
  glass: {
    backgroundColor: colors.onMediaGlass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.onMediaHairline,
  },
  // The live line, in a glass panel above the controls (iOS Live Captions).
  caption: {
    marginHorizontal: 20,
    marginBottom: 38,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 22,
    alignItems: 'center',
    gap: 4,
  },
  captionText: { fontSize: 17, lineHeight: 23, fontWeight: '500', letterSpacing: -0.3, color: colors.onMedia, textAlign: 'center' },
  // "2 min left", centred in the top row.
  warn: { height: 32, paddingHorizontal: 14, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
  warnText: { fontSize: 14, fontWeight: '600', color: colors.onMedia, fontVariant: ['tabular-nums'] },
  top: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: space.lg },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: 0.3, color: colors.onMedia, textAlign: 'center' },
  timer: { marginTop: 4, fontSize: 17, letterSpacing: -0.2, color: 'rgba(255,255,255,0.72)', fontVariant: ['tabular-nums'], textAlign: 'center' },
});

const styles = StyleSheet.create({
  controls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: space.xl },
  hidden: { display: 'none' },
  control: { alignItems: 'center', gap: space.sm, width: 84 },
  // Every button sits in a slot as tall as the hang-up, so the labels line up.
  slot: { height: 76, justifyContent: 'center' },
  label: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  toggle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  toggleOn: { backgroundColor: colors.onMedia },
  hangUp: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: systemColors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
