import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import type { CallLine } from '@/ai/call-prompt';
import { HELPLINE_URL } from '@/ai/safety';
import { callGlass } from '@/components/call/call-controls';
import { Anim, PressableScale, Txt } from '@/components/ui';
import { colors, fonts, space } from '@/theme';
import { inkFace, inkRadius } from '@/theme/ink';

/**
 * The live caption on a call on the model: their line in warm editorial serif inside a deep
 * obsidian dark-glass panel (with an optional friend-hue left bar echoing Chat's Variant A, used
 * on both 1:1 and active-speaker group calls), the user's own words softer, a wave while the user
 * speaks, dots while waiting, and Not Delivered with a retry when the model is busy.
 */
export function LiveCaption({
  talking,
  hearing,
  hearingFailed,
  caption,
  who,
  accentColor,
  waiting,
  failed,
  onRetryHearing,
  onRetry,
}: {
  talking: boolean;
  hearing: boolean;
  hearingFailed: boolean;
  caption: CallLine | null;
  /** The speaker's name on a group call. */
  who?: string;
  /** Optional friend-hue accent bar (active speaker on group calls, or friend hue on 1:1 calls). */
  accentColor?: string;
  waiting: boolean;
  failed: boolean;
  onRetryHearing: () => void;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const retry = hearingFailed ? onRetryHearing : failed ? onRetry : null;
  if (retry) {
    return (
      <PressableScale style={[styles.panel, callGlass.caption, styles.caption]} onPress={retry} accessibilityRole="button" accessibilityLabel={t('chat.tryAgain')}>
        <Txt style={callGlass.captionText}>{t('chat.notDelivered')}</Txt>
        <Txt style={styles.captionSoft}>{t('chat.tryAgain')}</Txt>
      </PressableScale>
    );
  }
  const mine = caption?.author === 'me';
  const accented = !!accentColor && !mine;
  return (
    <View style={[styles.panel, callGlass.caption, styles.caption]} accessibilityLiveRegion="polite">
      {talking ? (
        <Anim name="voiceWave" size={34} tint={colors.onMedia} />
      ) : (
        <>
          {caption && !hearing ? (
            <Animated.View
              key={caption.text}
              entering={FadeIn.duration(320)}
              style={accented ? [styles.accentedLine, { borderLeftColor: accentColor }] : undefined}>
              {who && !mine ? (
                <Txt style={[styles.who, accented && [styles.whoLeft, { color: accentColor }]]}>{who}</Txt>
              ) : null}
              <Txt style={mine ? styles.captionSoft : accented ? styles.theirSerifLeft : styles.theirSerif}>
                {mine ? caption.text : `“${caption.text}”`}
              </Txt>
            </Animated.View>
          ) : null}
          {hearing || waiting ? <Anim name="typing" size={30} tint={colors.onMedia} /> : null}
        </>
      )}
    </View>
  );
}

/** Help on the call itself after a crisis was heard; the chat gets the card too. */
export function CallHelpline() {
  const { t } = useTranslation();
  return (
    <PressableScale
      style={[callGlass.glass, styles.helpline]}
      onPress={() => void Linking.openURL(HELPLINE_URL)}
      accessibilityRole="link"
      accessibilityLabel={t('safety.helplineTitle')}>
      <Ionicons name="heart" size={17} color={colors.onMedia} />
      <Txt style={styles.helplineText}>{t('safety.helplineAction')}</Txt>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: 'rgba(20,20,28,0.84)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  caption: { minHeight: 58, justifyContent: 'center' },
  accentedLine: { alignSelf: 'stretch', borderLeftWidth: 2.5, paddingLeft: 12 },
  theirSerif: { fontFamily: fonts.serif, fontSize: 17, lineHeight: 23, color: 'rgba(255,255,255,0.95)', textAlign: 'center' },
  theirSerifLeft: { fontFamily: fonts.serifItalic, fontSize: 16.5, lineHeight: 23, color: 'rgba(255,255,255,0.94)', textAlign: 'left' },
  captionSoft: { ...inkFace('sub'), color: 'rgba(255,255,255,0.72)', textAlign: 'center' },
  who: { ...inkFace('caption'), color: 'rgba(255,255,255,0.72)', textAlign: 'center', marginBottom: 2 },
  whoLeft: { textAlign: 'left', fontWeight: '700', letterSpacing: 0.25 },
  helpline: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: inkRadius.pill,
    marginBottom: 14,
  },
  helplineText: { ...inkFace('bodyStrong'), color: colors.onMedia },
});
