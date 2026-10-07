import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { AVATARS } from '@/assets/avatars/registry';
import { avatarGradients, colors, palette, radius } from '@/theme';
import type { Character, User } from '@/types';

import { Mascot } from './mascot';
import { Txt } from './text';

export interface AvatarProps {
  /** A remote/local uri (string) or a bundled `require` (number). */
  source?: string | number;
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
        {source != null ? (
          <Image
            source={typeof source === 'string' ? { uri: source } : source}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            // Bundled art is instant; on web a cached image can also miss the fade's
            // load event and stay invisible, so only remote native images cross-fade.
            transition={typeof source === 'string' && Platform.OS !== 'web' ? 160 : undefined}
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
      name={character.name}
      accentIndex={character.accentIndex}
      {...rest}
    />
  );
}

/** You: your photo, or Rafti's sticker face for new accounts. */
export function UserAvatar({ user, size = 32, style }: { user: User; size?: number; style?: StyleProp<ViewStyle> }) {
  if (user.avatarUri) return <Avatar source={user.avatarUri} name={user.displayName} size={size} style={style} />;

  return (
    <View
      style={[
        styles.userFallback,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}>
      <Mascot size={size * 0.86} />
    </View>
  );
}

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
    backgroundColor: palette.apricot50,
    borderWidth: 1,
    borderColor: palette.apricot200,
  },
});
