import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import type { CallLine } from '@/ai/call-prompt';
import { HELPLINE_URL } from '@/ai/safety';
import { callGlass } from '@/components/call/call-controls';
import { Anim, PressableScale, Txt } from '@/components/ui';
import { colors, space } from '@/theme';

/**
 * The live caption on a call on the model: their line in quotes (on a group call with the speaker's
 * name over it), the user's own words softer, a wave while the user speaks, dots while the words are
 * written out or they answer, and Not Delivered with a retry when the model is busy.
 */
export function LiveCaption({
  talking,
  hearing,
  hearingFailed,
  caption,
  who,
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
  waiting: boolean;
  failed: boolean;
  onRetryHearing: () => void;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const retry = hearingFailed ? onRetryHearing : failed ? onRetry : null;
  if (retry) {
    return (
      <PressableScale style={[callGlass.glass, callGlass.caption, styles.caption]} onPress={retry} accessibilityRole="button" accessibilityLabel={t('chat.tryAgain')}>
        <Txt style={callGlass.captionText}>{t('chat.notDelivered')}</Txt>
        <Txt style={styles.captionSoft}>{t('chat.tryAgain')}</Txt>
      </PressableScale>
    );
  }
  const mine = caption?.author === 'me';
  return (
    <View style={[callGlass.glass, callGlass.caption, styles.caption]} accessibilityLiveRegion="polite">
      {talking ? (
        <Anim name="voiceWave" size={34} tint={colors.onMedia} />
      ) : (
        <>
          {caption && !hearing ? (
            <Animated.View key={caption.text} entering={FadeIn.duration(320)}>
              {who && !mine ? <Txt style={styles.who}>{who}</Txt> : null}
              <Txt style={mine ? styles.captionSoft : callGlass.captionText}>{mine ? caption.text : `“${caption.text}”`}</Txt>
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
  caption: { minHeight: 56, justifyContent: 'center' },
  captionSoft: { fontSize: 15, lineHeight: 21, color: 'rgba(255,255,255,0.72)', textAlign: 'center' },
  who: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.72)', textAlign: 'center', marginBottom: 2 },
  helpline: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    marginBottom: 14,
  },
  helplineText: { fontSize: 16, fontWeight: '600', color: colors.onMedia },
});
