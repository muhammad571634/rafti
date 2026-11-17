import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { MOMENT_FACE_AT, momentPicture } from '@/components/character/moment-picture';
import { sceneLook } from '@/components/scenes/scene-look';
import { POSTER, PosterFrame } from '@/components/share/poster-frame';
import { ShareCardSheet } from '@/components/share-card-sheet';
import { SFIcon, Txt } from '@/components/ui';
import { posterWords, userNames } from '@/lib/moment-poster';
import { stretchLeft } from '@/lib/portrait-focus';
import { currentMood, temperamentFor } from '@/lib/reply-engine';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, fonts } from '@/theme';
import { ink } from '@/theme/ink';
import type { Character, Scene } from '@/types';

/** The moment's picture inside the poster frame's body (`PosterFrame`: 328 wide, 370 tall). */
const BODY_W = 328;
const BODY_H = 370;
const SCRIM = ['rgba(0,0,0,0)', 'rgba(0,0,0,0.8)'] as const;

/**
 * A friend's moment as a 9:16 story poster, in the frame every poster shares (`PosterFrame`): their
 * face, name, mood and "Sigmazam character" on top, the moment as a photo card (their still or
 * portrait, its title, their first line in dark glass, "Step into this moment on Sigmazam"), the
 * Sigmazam band below. Never anything of the user (owner 2026-11-08): a line or setting that names
 * them is left off (`posterWords`).
 */
export function MomentPoster({ scene, character, name, mood, names }: { scene: Scene; character: Character; name: string; mood: string; names: readonly string[] }) {
  const { t } = useTranslation();
  const words = posterWords(scene, names);
  const picture = momentPicture(scene, character, BODY_W / BODY_H, true);
  const look = sceneLook(scene);
  const stretch = picture?.stretch ?? 1;

  return (
    <PosterFrame character={character} name={name} mood={mood}>
      <View style={styles.photo}>
        {picture ? (
          <Image
            source={picture.source}
            contentPosition={picture.position}
            contentFit="cover"
            style={stretch > 1 ? [styles.stretched, { width: BODY_W * stretch, left: stretchLeft(BODY_W, stretch, MOMENT_FACE_AT, picture.faceX) }] : StyleSheet.absoluteFill}
            accessible={false}
          />
        ) : (
          <>
            <LinearGradient colors={[look.fill, ink.card]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <View style={styles.glyph}>
              <SFIcon ios={look.ios} icon={look.icon} size={72} color={colors.onMedia} />
            </View>
          </>
        )}
        <LinearGradient colors={SCRIM} locations={[0.3, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={styles.words}>
          {words.title ? (
            <Txt style={styles.title} maxFontSizeMultiplier={1}>
              {words.title}
            </Txt>
          ) : null}
          {words.line ? (
            <View style={styles.bubble}>
              <Txt style={styles.line} maxFontSizeMultiplier={1}>
                {words.line}
              </Txt>
            </View>
          ) : words.setting ? (
            <Txt style={styles.setting} maxFontSizeMultiplier={1}>
              {words.setting}
            </Txt>
          ) : null}
          <View style={styles.hook}>
            <SFIcon ios="bubble.left.fill" icon="chatbubble" size={13} color={colors.onMedia} />
            <Txt style={styles.hookText} maxFontSizeMultiplier={1}>
              {t('sharePoster.moment')}
            </Txt>
          </View>
        </View>
      </View>
    </PosterFrame>
  );
}

/**
 * Share on a moment card: its poster in the share sheet. Pays shells only for a share that went
 * somewhere, once a day per moment (`ShareCardSheet`, `src/lib/share-outcome.ts`).
 */
export function MomentShareSheet({ scene, character, onClose }: { scene: Scene | null; character: Character; onClose: () => void }) {
  const { t } = useTranslation();
  const relationship = useAppStore((s) => s.relationships[character.id]);
  const user = useAppStore((s) => s.user.displayName);
  const personas = useAppStore((s) => s.personas);
  const names = useMemo(() => userNames(user, personas.map((p) => p.name)), [user, personas]);
  const name = displayName(character, relationship);
  const mood = currentMood(relationship?.mood, temperamentFor(character), Date.now()).emotion;
  // Keeps the last moment while the sheet slides away.
  const [shown, setShown] = useState(scene);
  if (scene && scene !== shown) setShown(scene);
  if (!shown) return null;
  const first = name.split(' ')[0] || name;
  return (
    <ShareCardSheet
      visible={!!scene}
      onClose={onClose}
      poster={POSTER}
      rewardKey={`moment:${shown.id}`}
      fallback={[shown.title, `${first} · ${t('sharePoster.badge')}`, t('sharePoster.moment'), t('sharePoster.store')].join('\n\n')}>
      <MomentPoster scene={shown} character={character} name={name} mood={t(`chat.mood.${mood}`)} names={names} />
    </ShareCardSheet>
  );
}

const styles = StyleSheet.create({
  photo: { flex: 1, borderRadius: 24, overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: ink.card },
  stretched: { position: 'absolute', top: 0, bottom: 0 },
  glyph: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 120, alignItems: 'center', justifyContent: 'center', opacity: 0.9 },
  words: { padding: 16, gap: 8 },
  title: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 27, letterSpacing: -0.25, color: colors.onMedia, textShadowColor: colors.onMediaShadow, textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
  bubble: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, borderBottomLeftRadius: 6, backgroundColor: colors.onMediaBubble },
  line: { fontSize: 15, lineHeight: 20, color: colors.onMedia },
  setting: { fontSize: 15, lineHeight: 20, color: colors.onMediaSoft, textShadowColor: colors.onMediaShadow, textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  hook: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 30,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: colors.onMediaGlass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.onMediaHairline,
  },
  hookText: { flexShrink: 1, fontSize: 13, lineHeight: 17, fontWeight: '700', color: colors.onMedia },
});
