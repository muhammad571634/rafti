import type { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useOnPhoto } from '@/components/chat/chat-ground';
import { MODULE_GLYPH, PressableScale, SymbolTile, Txt } from '@/components/ui';
import type { SFSymbol } from 'sf-symbols-typescript';
import { colors, moduleFills, palette, radius, space, systemColors } from '@/theme';
import type { NextKind } from '@/types';

/** Each moment's glyph and colour: the same as its tile in the + panel and More. */
const LOOK: Record<NextKind, { ios: SFSymbol; icon: keyof typeof Ionicons.glyphMap; fill: string }> = {
  call: { ...MODULE_GLYPH.calls, fill: moduleFills.calls },
  date: { ...MODULE_GLYPH.date, fill: moduleFills.date },
  quiz: { ios: 'questionmark', icon: 'help', fill: systemColors.indigo },
  truthOrDare: { ios: 'dice.fill', icon: 'dice', fill: systemColors.purple },
  diary: { ...MODULE_GLYPH.diary, fill: moduleFills.diary },
  secretNote: { ...MODULE_GLYPH.note, fill: moduleFills.note },
  bedtime: { ...MODULE_GLYPH.sleep, fill: moduleFills.sleep },
  photo: { ...MODULE_GLYPH.photo, fill: moduleFills.photo },
};

/**
 * The moment their reply invited the user to (`src/ai/next-moment.ts`, 0z283): one outlined pill
 * under their newest bubble, on their side (iOS suggested actions), with the module's own tile.
 * A tap opens it the way the + panel would; it shows only until the user writes again.
 */
export function NextChip({ kind, onOpen }: { kind: NextKind; onOpen: () => void }) {
  const { t } = useTranslation();
  const onPhoto = useOnPhoto();
  const look = LOOK[kind];
  const label = t(`chat.next.${kind}`);
  return (
    <View style={styles.row}>
      <PressableScale onPress={onOpen} scaleTo={0.95} style={[styles.chip, onPhoto && styles.photoChip]} accessibilityRole="button" accessibilityLabel={label}>
        <SymbolTile fill={look.fill} ios={look.ios} icon={look.icon} size={22} deep />
        <Txt style={styles.text} color={onPhoto ? palette.apricotCalm : colors.brandText} lines={1}>
          {label}
        </Txt>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  // Their side, under the bubble's start (the avatar gutter of their lines).
  row: { flexDirection: 'row', paddingLeft: space.xxl, paddingRight: space.xxl, paddingTop: space.xs, paddingBottom: space.sm + 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 34,
    maxWidth: '100%',
    paddingLeft: 6,
    paddingRight: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  text: { flexShrink: 1, fontSize: 15, fontWeight: '500', letterSpacing: -0.2 },
  // On a picture (an Art wallpaper): dark glass under a peach rim, as the other chips.
  photoChip: { backgroundColor: colors.onMediaBubble, borderColor: palette.apricotCalm },
});
