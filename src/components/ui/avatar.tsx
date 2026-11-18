import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { AVATARS } from '@/assets/avatars/registry';
import { avatarGradients, colors, palette, radius } from '@/theme';
import type { Character, User } from '@/types';

import { Txt } from './text';

export interface AvatarProps {
  /** A remote/local uri (string) or a bundled `require` (number). */
  source?: string | number;
  /** Shown if `source` fails to load (a character's bundled art); the monogram after that. */
  fallback?: string | number;
  name: string;
  size?: number;
  /** Index into the pastel gradient set; keeps a character's colour stable. */
  accentIndex?: number;
  /** Green check overlay used on discovery cards when the voice model is ready. */
  verified?: boolean;
  /** What the green badge shows: a check (voice ready) or a phone (they can be called). */
  badge?: 'check' | 'call';
  ring?: boolean;
  ringColor?: string;
  style?: StyleProp<ViewStyle>;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

/** An avatar without a picture renders a stable pastel monogram instead of an empty circle. */
export function Avatar({
  source,
  fallback,
  name,
  size = 48,
  accentIndex = 0,
  verified,
  badge: badgeKind = 'check',
  ring,
  ringColor = colors.primary,
  style,
}: AvatarProps) {
  const gradient = avatarGradients[accentIndex % avatarGradients.length];
  // Sources that failed to load; a new source simply is not in the list.
  const [failed, setFailed] = useState<(string | number)[]>([]);
  const shown = [source, fallback].find((s) => s != null && !failed.includes(s));
  const badge = Math.max(14, size * 0.3);

  return (
    <View style={[{ width: size, height: size }, style]}>
      <View
        style={[
          styles.clip,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: ring ? 2 : 0,
            borderColor: ringColor,
          },
        ]}>
        {shown != null ? (
          <Image
            source={typeof shown === 'string' ? { uri: shown } : shown}
            onError={() => setFailed((f) => [...f, shown])}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            // Bundled art is instant; on web a cached image can also miss the fade's
            // load event and stay invisible, so only remote native images cross-fade.
            transition={typeof shown === 'string' && Platform.OS !== 'web' ? 160 : undefined}
          />
        ) : (
          <LinearGradient colors={gradient} style={styles.fill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Txt
              variant="title"
              color={colors.white}
              style={{ fontSize: size * 0.36, lineHeight: size * 0.44 }}>
              {initials(name)}
            </Txt>
          </LinearGradient>
        )}
      </View>

      {verified ? (
        <View style={[styles.badge, { width: badge, height: badge, borderRadius: badge / 2 }]}>
          <Ionicons name={badgeKind === 'call' ? 'call' : 'checkmark'} size={badge * (badgeKind === 'call' ? 0.55 : 0.66)} color={colors.white} />
        </View>
      ) : null}
    </View>
  );
}

/** Bundled seed art is keyed by character id; created characters carry their own uri. */
export const characterImage = (character: Character): string | number | undefined =>
  character.avatarUri ?? AVATARS[character.id];

export function CharacterAvatar({
  character,
  ...rest
}: { character: Character } & Omit<AvatarProps, 'source' | 'name' | 'accentIndex'>) {
  return (
    <Avatar
      source={characterImage(character)}
      fallback={character.avatarUri ? AVATARS[character.id] : undefined}
      name={character.name}
      accentIndex={character.accentIndex}
      {...rest}
    />
  );
}

/** Your initials, as iOS Contacts draws them: first and last word, whole letters in any script, "?" when empty. */
export function userInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = (w?: string) => (w ? (Array.from(w)[0] ?? '') : '');
  const picked = words.length > 1 ? [words[0], words[words.length - 1]] : words;
  return picked.map(first).join('').toLocaleUpperCase() || '?';
}

/**
 * You: your photo, or your initials (owner, 2026-11-18: no mascot for the user; iOS Contacts' grey
 * monogram). `glass` draws the monogram in clear glass for a photo ground (Today's hero), so the
 * friend's picture shows through.
 */
export function UserAvatar({ user, size = 32, glass, style }: { user: User; size?: number; glass?: boolean; style?: StyleProp<ViewStyle> }) {
  if (user.avatarUri) return <Avatar source={user.avatarUri} name={user.displayName} size={size} style={style} />;
  const letters = userInitials(user.displayName);
  return (
    <View
      accessible
      accessibilityLabel={user.displayName}
      style={[styles.userFallback, glass && styles.userGlass, { width: size, height: size, borderRadius: size / 2 }, style]}>
      {glass ? null : <LinearGradient colors={MONOGRAM} style={StyleSheet.absoluteFill} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />}
      <Txt variant="title" color={colors.white} style={{ fontSize: size * (letters.length > 1 ? 0.38 : 0.44), lineHeight: size * 0.52, fontWeight: '600' }}>
        {letters}
      </Txt>
    </View>
  );
}

/** iOS Contacts' monogram grey, top to bottom. */
const MONOGRAM = ['#A2A2AA', '#6E6E76'] as const;

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  fill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.green,
    borderWidth: 2,
    borderColor: colors.surface,
    borderRadius: radius.pill,
  },
  userFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // Clear glass over a photo, as the chat header's round buttons.
  userGlass: {
    backgroundColor: colors.onMediaGlass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.onMediaHairline,
  },
});
