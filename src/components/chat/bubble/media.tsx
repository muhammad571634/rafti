import { Image } from 'expo-image';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Polaroid } from '@/components/date/polaroid';
import { InkText } from '@/components/ink';
import { MoodGlyph } from '@/components/mood/mood-glyph';
import { BoothPicture, fitWidth } from '@/components/photo-booth/booth-picture';
import { isMoodBand, MOOD_KEYS } from '@/lib/mood';
import { useAppStore } from '@/store/use-app-store';
import { colors, radius, space } from '@/theme';
import { ink, inkRadius } from '@/theme/ink';
import type { Character } from '@/types';

import { SystemLine } from './notes';

/** The largest a sent photo is drawn in the chat; it keeps its own shape inside these. */
const PHOTO_MAX_W = 240;
const PHOTO_MAX_H = 300;

/** A sent photo in its own shape (width over height kept when it was sent, or read as it loads). */
export function ChatPhoto({ uri, aspect }: { uri: string; aspect?: number }) {
  const [loaded, setLoaded] = useState<number>();
  const shape = Math.max(0.5, Math.min(2, aspect ?? loaded ?? 0.8));
  const width = Math.min(PHOTO_MAX_W, PHOTO_MAX_H * shape);
  return (
    <Image
      source={{ uri }}
      style={[styles.photo, { width, height: width / shape }]}
      contentFit="cover"
      onLoad={(e) => {
        if (!aspect && e.source.width > 0 && e.source.height > 0) setLoaded(e.source.width / e.source.height);
      }}
    />
  );
}

/** A date's polaroid the user sent to this friend (0z157), drawn from the kept date. */
export function DatePhotoMessage({ dateId, caption }: { dateId: string; caption: string }) {
  const { i18n } = useTranslation();
  const record = useAppStore((s) => s.dates.find((d) => d.id === dateId));
  const partner = useAppStore((s) => (record ? s.characters.find((c) => c.id === record.characterId) : undefined));
  // A date whose friend is gone (blocked, deleted) keeps its caption as a plain line.
  if (!record || !partner) return <SystemLine text={caption} />;
  const when = new Date(record.createdAt).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' });
  return <Polaroid character={partner} caption={caption} date={when} width={176} tilt={2} style={styles.datePhoto} />;
}

/** A Photo Booth picture sent to the chat, drawn from the kept photo; a tap opens it. */
export function BoothPhotoMessage({ photoId, character }: { photoId: string; character: Character }) {
  const photo = useAppStore((s) => s.photos.find((p) => p.id === photoId));
  if (!photo) return <View style={styles.photo} />;
  return <BoothPicture photo={photo} character={character} width={fitWidth(photo.style, { width: 176, height: 240 })} />;
}

/** A mood check-in the user shared (Today's "How are you?"): the feeling's shape and its word, in the app's language. */
export function MoodMessage({ band, text }: { band: number; text: string }) {
  const { t } = useTranslation();
  if (!isMoodBand(band)) return <SystemLine text={text} />;
  const word = t(`mood.band.${MOOD_KEYS[band]}`);
  return (
    <View style={styles.mood} accessible accessibilityLabel={t('mood.message', { word })}>
      <MoodGlyph band={band} size={40} />
      <InkText variant="cardSmall" lines={2} style={styles.moodWord}>
        {word}
      </InkText>
    </View>
  );
}

const styles = StyleSheet.create({
  mood: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.xs,
    paddingLeft: space.xs,
    paddingRight: space.md,
    borderRadius: inkRadius.row,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
  },
  moodWord: { flexShrink: 1 },
  // A sent polaroid keeps clear of the next bubble's tilt.
  datePhoto: { marginVertical: space.sm },
  photo: {
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.surfaceAlt,
  },
});
