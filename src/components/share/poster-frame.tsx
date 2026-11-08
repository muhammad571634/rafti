import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { BRAND, BRAND_ASPECT } from '@/assets/brand/registry';
import { BrandArt, CharacterAvatar, SFIcon, Txt } from '@/components/ui';
import { fonts } from '@/theme';
import type { Character } from '@/types';

/** The poster's size on screen; it is captured at 3x, 1080 x 1920, a story's own size. */
export const POSTER_W = 360;
export const POSTER_H = 640;
export const POSTER_PIXELS = { width: 1080, height: 1920 } as const;
/** What `ShareCardSheet` takes for a poster. */
export const POSTER = { width: POSTER_W, height: POSTER_H, pixels: POSTER_PIXELS } as const;

/**
 * Fixed light paper: the shared picture looks the same whatever theme the phone is in
 * (the chat's cream, white and peach; canvas B, owner's pick 2026-11-08).
 */
export const PAPER = {
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

const LOGO_H = 30;
const PEEK_W = 132;
const BAND_H = 112;

/**
 * Every story poster's frame (canvas https://claude.ai/artifact/EJDVhf2eeR8RXzfo2Aw61w, B): cream
 * paper with two soft blobs; on top the friend's face with an online dot, their name, "AI · mood"
 * and a "Sigmazam character" app badge (owner: say it is a chat with a character of the app); the
 * poster's own content in the middle (`children`: a chat, a bond); at the bottom a white band with
 * the Sigmazam logo, the app's tagline and "Free on the App Store", and the mascot peeking over it.
 * A fixed 360 x 640 view; the share sheet captures it (`ShareCardSheet` `poster`).
 */
export function PosterFrame({ character, name, mood, children }: { character: Character; name: string; mood: string; children: ReactNode }) {
  const { t } = useTranslation();
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
          {/* Where they live: a character of the Sigmazam app, as an app tile and its name. */}
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

      <View style={styles.body}>{children}</View>

      <View style={styles.band}>
        <Image source={BRAND.logo} style={styles.logo} contentFit="contain" contentPosition="left center" accessibilityLabel={t('app.name')} />
        <Txt style={styles.tagline} lines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1}>
          {t('app.tagline')}
        </Txt>
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
  head: { position: 'absolute', left: 22, right: 22, top: 30, flexDirection: 'row', alignItems: 'center', gap: 14 },
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
  // The poster's own content: under the head, above the band.
  body: { position: 'absolute', left: 16, right: 16, top: 146, bottom: BAND_H + 12 },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: BAND_H,
    paddingLeft: 22,
    paddingRight: PEEK_W + 12,
    justifyContent: 'center',
    gap: 5,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: PAPER.card,
  },
  logo: { width: LOGO_H * BRAND_ASPECT.logo, maxWidth: '100%', height: LOGO_H },
  tagline: { fontSize: 12, lineHeight: 16, fontWeight: '600', color: PAPER.soft },
  store: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    marginTop: 2,
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
