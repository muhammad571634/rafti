import type { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { BRAND, BRAND_ASPECT } from '@/assets/brand/registry';
import { portraitOf } from '@/components/chat/chat-ground';
import { PAPER, POSTER, POSTER_H, POSTER_W } from '@/components/share/poster-frame';
import { ShareCardSheet } from '@/components/share-card-sheet';
import { BrandArt, CharacterAvatar, SFIcon, Txt, UserAvatar } from '@/components/ui';
import { shortName } from '@/lib/format';
import { currentMood, temperamentFor } from '@/lib/reply-engine';
import { displayName, useAppStore } from '@/store/use-app-store';
import { fonts, friendColor } from '@/theme';
import type { Character, Relationship } from '@/types';

const ON_PHOTO = '#FFFFFF';
const ON_PHOTO_SOFT = 'rgba(255,255,255,0.84)';
const GLASS = 'rgba(255,255,255,0.16)';
const GLASS_RIM = 'rgba(255,255,255,0.32)';
const TOP_SCRIM = ['rgba(0,0,0,0.5)', 'rgba(0,0,0,0)'] as const;
const BOTTOM_SCRIM = ['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.88)'] as const;
const FACE = 52;
const LOGO_H = 24;
const WINK = 96;

/**
 * Share on Us as a story poster (canvas https://claude.ai/artifact/EJDVhf2eeR8RXzfo2Aw61w, C, owner's
 * pick for Us 2026-11-08): the friend's own big picture behind everything, their face, name, "AI ·
 * mood" and the Sigmazam character badge on top; you and them, how many days together, big, and
 * the three figures Us counts (intimacy, day streak, first met) as clear glass; a cream pill with
 * the Sigmazam logo, "Talk to {name} on Sigmazam" and "Free on the App Store", the mascot winking
 * over it. Only what the app really counts (owner 2026-10-30). Captured at 1080 x 1920.
 */
export function BondShareSheet({
  visible,
  onClose,
  character,
  relationship,
  days,
}: {
  visible: boolean;
  onClose: () => void;
  character: Character;
  relationship: Relationship;
  days: number;
}) {
  const { t } = useTranslation();
  const name = displayName(character, relationship);
  const together = `${days} ${t('us.daysLabel', { count: days })}`;

  return (
    <ShareCardSheet
      visible={visible}
      onClose={onClose}
      poster={POSTER}
      rewardKey={`bond:${character.id}`}
      fallback={[`${name}: ${together}`, t('sharePoster.talkTo', { name: shortName(name) }), t('app.name')].join('\n\n')}>
      <BondPoster character={character} relationship={relationship} days={days} />
    </ShareCardSheet>
  );
}

function BondPoster({ character, relationship, days }: { character: Character; relationship: Relationship; days: number }) {
  const { t, i18n } = useTranslation();
  const user = useAppStore((s) => s.user);
  const name = displayName(character, relationship);
  const first = shortName(name);
  // The title's "&" as it is, as groups write it: an English "and" reads wrong in other languages.
  const pair = user.displayName ? `${user.displayName} & ${first}` : first;
  const met = new Date(relationship.anniversary).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' });
  const mood = currentMood(relationship.mood, temperamentFor(character), Date.now()).emotion;
  const picture = portraitOf(character, POSTER_W / POSTER_H);
  // Without a picture of their own: their friend hue, as Find's cards draw them.
  const hue = friendColor(character.id);

  return (
    <View style={[styles.poster, { backgroundColor: picture ? PAPER.ink : hue.fill }]}>
      {picture ? (
        <Image source={picture.source} contentPosition={picture.position} contentFit="cover" style={StyleSheet.absoluteFill} accessible={false} />
      ) : (
        <View style={styles.noPicture}>
          <CharacterAvatar character={character} size={200} />
        </View>
      )}
      <LinearGradient colors={TOP_SCRIM} style={styles.topScrim} pointerEvents="none" />
      <LinearGradient colors={BOTTOM_SCRIM} locations={[0, 0.45, 1]} style={styles.bottomScrim} pointerEvents="none" />

      <View style={styles.head}>
        <View style={styles.headFace}>
          <CharacterAvatar character={character} size={40} />
        </View>
        <View style={styles.headText}>
          <Txt style={styles.headName} lines={1} maxFontSizeMultiplier={1}>
            {name}
          </Txt>
          <Txt style={styles.headMood} lines={1} maxFontSizeMultiplier={1}>
            {`${t('chat.aiShort')} · ${t(`chat.mood.${mood}`)}`}
          </Txt>
        </View>
      </View>
      <View style={styles.badge}>
        <View style={styles.appTile}>
          <Image source={BRAND.wink} style={styles.appMascot} contentFit="contain" accessible={false} />
        </View>
        <Txt style={styles.badgeText} lines={1} maxFontSizeMultiplier={1}>
          {t('sharePoster.badge')}
        </Txt>
      </View>

      <View style={styles.bond}>
        <View style={styles.faces}>
          <View style={styles.faceRing}>
            <UserAvatar user={user} size={FACE} />
          </View>
          <View style={[styles.faceRing, styles.overlap]}>
            <CharacterAvatar character={character} size={FACE} />
          </View>
          <View style={styles.heart}>
            <SFIcon ios="heart.fill" icon="heart" size={13} color="#FF6B8A" />
          </View>
        </View>
        <Txt style={styles.pair} lines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1}>
          {pair}
        </Txt>
        <Txt style={styles.days} lines={1} maxFontSizeMultiplier={1}>
          {days}
        </Txt>
        <Txt style={styles.daysLabel} lines={1} maxFontSizeMultiplier={1}>
          {t('us.daysLabel', { count: days })}
        </Txt>
        <View style={styles.stats}>
          <Stat ios="heart.fill" icon="heart" value={String(relationship.intimacy)} label={t('us.statIntimacy')} />
          <Stat ios="flame.fill" icon="flame" value={String(relationship.streakDays)} label={t('us.statStreak')} />
          <Stat ios="sparkles" icon="sparkles" value={met} label={t('us.statMet')} />
        </View>
      </View>

      <View style={styles.pill}>
        <Image source={BRAND.logo} style={styles.logo} contentFit="contain" contentPosition="left center" accessibilityLabel={t('app.name')} />
        <Txt style={styles.talk} lines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1}>
          {t('sharePoster.talkTo', { name: first })}
        </Txt>
        <View style={styles.store}>
          <SFIcon ios="arrow.down.circle.fill" icon="arrow-down-circle" size={12} color={PAPER.card} />
          <Txt style={styles.storeText} lines={1} maxFontSizeMultiplier={1}>
            {t('sharePoster.store')}
          </Txt>
        </View>
      </View>
      <BrandArt name="wink" width={WINK} style={styles.wink} />
    </View>
  );
}

/** One of Us' figures on clear glass: its glyph and number, its name under them. */
function Stat({ ios, icon, value, label }: { ios: SFSymbol; icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <View style={styles.statTop}>
        <SFIcon ios={ios} icon={icon} size={14} color={ON_PHOTO} />
        <Txt style={styles.statValue} lines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1}>
          {value}
        </Txt>
      </View>
      <Txt style={styles.statLabel} lines={1} adjustsFontSizeToFit minimumFontScale={0.75} maxFontSizeMultiplier={1}>
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  poster: { width: POSTER_W, height: POSTER_H, overflow: 'hidden' },
  noPicture: { ...StyleSheet.absoluteFill, alignItems: 'center', paddingTop: 110 },
  topScrim: { position: 'absolute', left: 0, right: 0, top: 0, height: 170 },
  bottomScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 460 },
  head: { position: 'absolute', left: 18, right: 18, top: 22, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headFace: { width: 44, height: 44, borderRadius: 22, padding: 2, backgroundColor: 'rgba(255,255,255,0.9)' },
  headText: { flex: 1, minWidth: 0 },
  headName: { fontFamily: fonts.playful, fontSize: 17, lineHeight: 21, color: ON_PHOTO },
  headMood: { fontSize: 12, fontWeight: '600', color: ON_PHOTO_SOFT },
  badge: {
    position: 'absolute',
    left: 18,
    top: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 28,
    paddingLeft: 4,
    paddingRight: 11,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GLASS_RIM,
    backgroundColor: GLASS,
  },
  appTile: { width: 20, height: 20, borderRadius: 6, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: PAPER.peach },
  appMascot: { width: 18, height: 18 },
  badgeText: { fontFamily: fonts.playfulBold, fontSize: 12, color: ON_PHOTO },
  bond: { position: 'absolute', left: 20, right: 20, top: 236, alignItems: 'center' },
  faces: { flexDirection: 'row', alignItems: 'center' },
  faceRing: { padding: 3, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.92)' },
  overlap: { marginLeft: -14 },
  // A white coin on the seam between the two faces.
  heart: {
    position: 'absolute',
    left: FACE - 6,
    bottom: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PAPER.card,
  },
  pair: { marginTop: 10, fontFamily: fonts.playful, fontSize: 20, lineHeight: 26, color: ON_PHOTO, textAlign: 'center' },
  days: { marginTop: 2, fontFamily: fonts.playful, fontSize: 72, lineHeight: 80, color: ON_PHOTO, fontVariant: ['tabular-nums'] },
  daysLabel: { marginTop: -6, fontFamily: fonts.playfulBold, fontSize: 17, lineHeight: 22, color: ON_PHOTO },
  stats: { alignSelf: 'stretch', flexDirection: 'row', gap: 8, marginTop: 16 },
  stat: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GLASS_RIM,
    backgroundColor: GLASS,
    alignItems: 'center',
    gap: 2,
  },
  statTop: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statValue: { flexShrink: 1, fontFamily: fonts.playful, fontSize: 17, lineHeight: 21, color: ON_PHOTO, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 11, fontWeight: '600', color: ON_PHOTO_SOFT },
  pill: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 22,
    height: 78,
    paddingLeft: 18,
    paddingRight: WINK + 8,
    borderRadius: 26,
    justifyContent: 'center',
    gap: 3,
    backgroundColor: PAPER.ground,
  },
  logo: { width: LOGO_H * BRAND_ASPECT.logo, maxWidth: '100%', height: LOGO_H },
  talk: { fontSize: 12, lineHeight: 15, fontWeight: '700', color: PAPER.soft },
  store: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 20,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: PAPER.ink,
  },
  storeText: { flexShrink: 1, fontSize: 10, fontWeight: '700', color: PAPER.card },
  wink: { position: 'absolute', right: 18, bottom: 30 },
});
