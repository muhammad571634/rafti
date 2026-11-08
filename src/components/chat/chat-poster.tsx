import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { BRAND, BRAND_ASPECT } from '@/assets/brand/registry';
import { BrandArt, CharacterAvatar, SFIcon, Txt } from '@/components/ui';
import { fill } from '@/i18n/voice';
import { fonts } from '@/theme';
import type { Character } from '@/types';

/** The poster's size on screen; it is captured at 3x, 1080 x 1920, a story's own size. */
export const POSTER_W = 360;
export const POSTER_H = 640;
export const POSTER_PIXELS = { width: 1080, height: 1920 } as const;

/** How many FOMO scripts each language has (`sharePoster.s1` ... `sN`). */
export const POSTER_SCRIPTS = 3;

/**
 * Fixed light paper: the shared picture looks the same whatever theme the phone is in
 * (the chat's cream, white and peach bubbles; canvas B, owner's pick 2026-11-08).
 */
const PAPER = {
  ground: '#FBF6EE',
  blobPeach: '#FFE3CC',
  blobSand: '#F3EEE6',
  ink: '#1F1A17',
  soft: '#6B625B',
  peach: '#FFC497',
  brand: '#A8531F',
  card: '#FFFFFF',
  rim: '#EFE7DC',
  online: '#34C759',
  dotLight: '#C9BFB4',
  dotDark: '#A89D92',
} as const;

const LOGO_H = 32;
const FADE = ['rgba(255,255,255,0)', PAPER.card] as const;
const PEEK_W = 132;

/**
 * The picture Share makes from a chat (canvas https://claude.ai/artifact/EJDVhf2eeR8RXzfo2Aw61w, B):
 * their face, name and "AI · mood", then a short FOMO exchange from `sharePoster.s{script}` in the
 * app's language (owner: nothing is taken from the real chat for now), their last line cut off
 * and "still typing", then the Sigmazam band: logo, "Free on the App Store" and the peeking mascot.
 * A fixed 360 x 640 view; the share sheet captures it (`ShareCardSheet` `poster`).
 */
export function ChatPoster({ character, name, mood, script }: { character: Character; name: string; mood: string; script: number }) {
  const { t } = useTranslation();
  const first = name.split(' ')[0] || name;
  // A line the friend says follows their gender where the language needs it (`{g:female|male}`).
  const line = (key: string) => fill(t(`sharePoster.s${script}.${key}`, { name: first }), {}, character.gender);

  return (
    <View style={styles.poster}>
      <View style={[styles.blob, styles.blobPeach]} />
      <View style={[styles.blob, styles.blobSand]} />

      <View style={styles.head}>
        <View style={styles.faceRing}>
          <CharacterAvatar character={character} size={70} />
          <View style={styles.online} />
        </View>
        <View style={styles.headText}>
          <Txt style={styles.name} lines={1} adjustsFontSizeToFit minimumFontScale={0.6} maxFontSizeMultiplier={1}>
            {name}
          </Txt>
          <Txt style={styles.mood} lines={1} maxFontSizeMultiplier={1}>
            {`${t('chat.aiShort')} · ${mood}`}
          </Txt>
          {/* Where they live: a character of the Sigmazam app (owner 2026-11-08), as an app tile and its name. */}
          <View style={styles.badge}>
            <View style={styles.appTile}>
              <Image source={BRAND.wink} style={styles.appMascot} contentFit="contain" accessible={false} />
            </View>
            <Txt style={styles.badgeText} lines={1} maxFontSizeMultiplier={1}>
              {t('sharePoster.badge')}
            </Txt>
          </View>
        </View>
      </View>

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

      <View style={styles.band}>
        <Image source={BRAND.logo} style={styles.logo} contentFit="contain" contentPosition="left center" accessibilityLabel={t('app.name')} />
        <View style={styles.store}>
          <SFIcon ios="arrow.down.circle.fill" icon="arrow-down-circle" size={14} color={PAPER.card} />
          <Txt style={styles.storeText} lines={1} maxFontSizeMultiplier={1}>
            {t('sharePoster.store')}
          </Txt>
        </View>
      </View>
      <BrandArt name="peek" width={PEEK_W} style={styles.peek} />
    </View>
  );
}

const styles = StyleSheet.create({
  poster: { width: POSTER_W, height: POSTER_H, overflow: 'hidden', backgroundColor: PAPER.ground },
  blob: { position: 'absolute', borderRadius: 999 },
  blobPeach: { left: -60, top: -80, width: 260, height: 260, backgroundColor: PAPER.blobPeach },
  blobSand: { right: -70, top: 120, width: 200, height: 200, backgroundColor: PAPER.blobSand },
  head: { position: 'absolute', left: 22, right: 22, top: 32, flexDirection: 'row', alignItems: 'center', gap: 14 },
  faceRing: { width: 76, height: 76, borderRadius: 38, padding: 3, backgroundColor: PAPER.card },
  online: {
    position: 'absolute',
    right: 2,
    bottom: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: PAPER.card,
    backgroundColor: PAPER.online,
  },
  headText: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontFamily: fonts.playful, fontSize: 28, lineHeight: 34, color: PAPER.ink },
  mood: { fontSize: 13, fontWeight: '600', color: PAPER.soft },
  badge: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 28,
    paddingLeft: 4,
    paddingRight: 11,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PAPER.rim,
    backgroundColor: PAPER.card,
  },
  appTile: { width: 20, height: 20, borderRadius: 6, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: PAPER.peach },
  appMascot: { width: 18, height: 18 },
  badgeText: { flexShrink: 1, fontFamily: fonts.playfulBold, fontSize: 12, color: PAPER.ink },
  thread: { position: 'absolute', left: 16, right: 16, top: 150, gap: 8 },
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
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 96,
    paddingLeft: 22,
    paddingRight: PEEK_W + 16,
    justifyContent: 'center',
    gap: 7,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: PAPER.card,
  },
  logo: { width: LOGO_H * BRAND_ASPECT.logo, maxWidth: '100%', height: LOGO_H },
  store: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 24,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: PAPER.ink,
  },
  storeText: { flexShrink: 1, fontSize: 11, fontWeight: '700', color: PAPER.card },
  peek: { position: 'absolute', right: 10, bottom: 0 },
});
