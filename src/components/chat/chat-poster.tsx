import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { PAPER, PosterFrame } from '@/components/share/poster-frame';
import { Txt } from '@/components/ui';
import { fill } from '@/i18n/voice';
import type { Character } from '@/types';

/** How many FOMO scripts each language has (`sharePoster.s1` ... `sN`). */
export const POSTER_SCRIPTS = 3;

const FADE = ['rgba(255,255,255,0)', PAPER.card] as const;

/**
 * The picture Share makes from a chat, in the poster frame (`PosterFrame`): a short FOMO exchange
 * from `sharePoster.s{script}` in the app's language (owner: nothing is taken from the real chat for
 * now), their last line cut off, and "still typing… open Sigmazam to read it".
 */
export function ChatPoster({ character, name, mood, script }: { character: Character; name: string; mood: string; script: number }) {
  const { t } = useTranslation();
  const first = name.split(' ')[0] || name;
  // A line the friend says follows their gender where the language needs it (`{g:female|male}`).
  const line = (key: string) => fill(t(`sharePoster.s${script}.${key}`, { name: first }), {}, character.gender);

  return (
    <PosterFrame character={character} name={name} mood={mood}>
      <View style={styles.thread}>
        <View style={[styles.bubble, styles.mine]}>
          <Txt style={styles.text} maxFontSizeMultiplier={1}>
            {line('you')}
          </Txt>
        </View>
        <View style={[styles.bubble, styles.theirs]}>
          <Txt style={styles.text} maxFontSizeMultiplier={1}>
            {line('a')}
          </Txt>
        </View>
        <View style={[styles.bubble, styles.theirs]}>
          <Txt style={styles.text} maxFontSizeMultiplier={1}>
            <Txt style={[styles.text, styles.hook]} maxFontSizeMultiplier={1}>
              {line('hook')}
            </Txt>{' '}
            <Txt style={[styles.text, styles.tail]} maxFontSizeMultiplier={1}>
              {line('tail')}
            </Txt>
          </Txt>
          {/* The end of the last line fades out: the rest is in the app. */}
          <LinearGradient colors={FADE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.fade} pointerEvents="none" />
        </View>
        <View style={styles.typing}>
          <View style={[styles.dot, { backgroundColor: PAPER.dotLight }]} />
          <View style={[styles.dot, { backgroundColor: PAPER.dotDark }]} />
          <View style={[styles.dot, { backgroundColor: PAPER.dotLight }]} />
        </View>
        <Txt style={styles.still} lines={2} maxFontSizeMultiplier={1}>
          {t('sharePoster.typing', { name: first })}
        </Txt>
      </View>
    </PosterFrame>
  );
}

const styles = StyleSheet.create({
  thread: { gap: 8 },
  bubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 22 },
  mine: { alignSelf: 'flex-end', maxWidth: 280, borderBottomRightRadius: 6, backgroundColor: PAPER.peach },
  theirs: {
    alignSelf: 'flex-start',
    maxWidth: 312,
    overflow: 'hidden',
    borderBottomLeftRadius: 6,
    backgroundColor: PAPER.card,
    borderWidth: 1,
    borderColor: PAPER.rim,
  },
  text: { fontSize: 16, lineHeight: 22, color: PAPER.ink },
  hook: { fontWeight: '700' },
  // The cut-off end of their line (canvas: a fade to nothing); RN text cannot mask, so it is pale.
  tail: { color: PAPER.dotDark },
  fade: { position: 'absolute', right: 0, bottom: 0, width: '55%', height: 34 },
  typing: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PAPER.rim,
    backgroundColor: PAPER.card,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  still: { paddingLeft: 6, fontSize: 12, lineHeight: 16, fontWeight: '600', color: PAPER.brand },
});
