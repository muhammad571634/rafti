import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type { TFunction } from 'i18next';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { HEROES } from '@/assets/heroes/registry';
import { CharacterAvatar, characterImage, GlassButton, Sheet, Txt } from '@/components/ui';
import { shortName } from '@/lib/format';
import { useAppStore } from '@/store/use-app-store';
import { colors, space, systemColors } from '@/theme';
import type { Character, LoreEntry, LoreKind, Lorebook } from '@/types';

type IconName = keyof typeof Ionicons.glyphMap;

/** Each kind of entry keeps one iOS hue and glyph wherever it shows (never orange: kept for warnings). */
export const KIND_LOOK: Record<LoreKind, { icon: IconName; fill: string }> = {
  person: { icon: 'person', fill: systemColors.blue },
  place: { icon: 'location', fill: systemColors.green },
  thing: { icon: 'cube', fill: systemColors.brown },
  event: { icon: 'calendar', fill: systemColors.red },
  group: { icon: 'people', fill: systemColors.indigo },
  rule: { icon: 'shield-checkmark', fill: systemColors.purple },
};

/** The worlds' books and the user's own, as Settings-style tiles. */
export const BOOK_LOOK = {
  world: { icon: 'planet' as IconName, fill: systemColors.indigo },
  own: { icon: 'library' as IconName, fill: systemColors.teal },
};

/** A world's picture for its book's row: its first face's scene, as Find's world tile shows it. */
export function useWorldArt(series?: string) {
  return useAppStore((s) => {
    const lead = series ? s.characters.find((c) => c.series === series) : undefined;
    return lead ? (HEROES[lead.id] ?? characterImage(lead)) : undefined;
  });
}

/** Who one of the user's books serves: "Used by Kai, Theo", or that it is not used yet. */
export function servesLine(book: Lorebook, characters: Character[], t: TFunction) {
  const names = book.characterIds
    .map((id) => characters.find((c) => c.id === id))
    .filter((c): c is Character => !!c)
    .map((c) => shortName(c.name));
  return names.length ? t('lore.servesFriends', { names: names.join(', ') }) : t('lore.notUsed');
}

function Tile({ icon, fill }: { icon: IconName; fill: string }) {
  return (
    <View style={[styles.tile, { backgroundColor: fill }]}>
      <Ionicons name={icon} size={17} color={colors.white} />
    </View>
  );
}

/**
 * A book in a list: its tile, its name, then how many entries and who it serves, and a chevron.
 * `right` (a link mark) sits beside the row as its own button, never inside it.
 */
export function BookRow({
  official,
  series,
  name,
  hint,
  count,
  last,
  onPress,
  right,
}: {
  official?: boolean;
  /** An official book's world: its row shows the world's picture instead of a tile. */
  series?: string;
  name: string;
  hint?: string;
  count: number;
  last?: boolean;
  onPress: () => void;
  right?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const look = official ? BOOK_LOOK.world : BOOK_LOOK.own;
  const art = useWorldArt(series);
  const line = [t('lore.entryCount', { count }), hint].filter(Boolean).join(' · ');
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${line}`}
        style={({ pressed }) => [styles.row, styles.grow, pressed && styles.pressed]}>
        {art ? <Image source={art} style={styles.art} contentFit="cover" transition={150} /> : <Tile {...look} />}
        <View style={[styles.body, art ? styles.artBody : null, !last && styles.line]}>
          <View style={styles.flex}>
            <Txt style={styles.title} lines={1}>
              {name}
            </Txt>
            <Txt style={styles.hint} lines={1}>
              {line}
            </Txt>
          </View>
          {right ? null : <Ionicons name="chevron-forward" size={15} color={colors.textFaint} />}
        </View>
      </Pressable>
      {right ? <View style={[styles.side, !last && styles.line]}>{right}</View> : null}
    </View>
  );
}

/**
 * An entry: its kind's tile, the name, what is true about it and the words that call it up.
 * `note` replaces the keywords line (in a chat: the word that brought it up). Read-only rows show
 * the whole text; rows that open an editor show two lines and a chevron.
 */
export function EntryRow({ entry, note, last, onPress }: { entry: LoreEntry; note?: string; last?: boolean; onPress?: () => void }) {
  const { t } = useTranslation();
  // One of the cast shows their face, the way Contacts does, instead of the person tile.
  const person = useAppStore((s) => (entry.characterId ? s.characters.find((c) => c.id === entry.characterId) : undefined));
  const words = entry.keywords.join(' · ');
  const under = note ?? (words ? t('lore.keywordsLine', { words }) : undefined);
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={[entry.name, t(`lore.kind.${entry.kind}`), entry.text].join(', ')}
      style={({ pressed }) => [styles.row, styles.top, pressed && onPress ? styles.pressed : null]}>
      <View style={styles.tileTop}>
        {person ? <CharacterAvatar character={person} size={30} /> : <Tile {...KIND_LOOK[entry.kind]} />}
      </View>
      <View style={[styles.body, styles.entryBody, !last && styles.line]}>
        <View style={styles.flex}>
          <Txt style={styles.title} lines={1}>
            {entry.name}
          </Txt>
          <Txt style={styles.text} lines={onPress ? 2 : undefined}>
            {entry.text}
          </Txt>
          {under ? (
            <Txt style={styles.hint} lines={1}>
              {under}
            </Txt>
          ) : null}
        </View>
        {onPress ? <Ionicons name="chevron-forward" size={15} color={colors.textFaint} /> : null}
      </View>
    </Pressable>
  );
}

const INFO = [
  { key: 'always', icon: 'book' as IconName, fill: BOOK_LOOK.world.fill },
  { key: 'comesUp', icon: 'chatbubble-ellipses' as IconName, fill: systemColors.blue },
  { key: 'yours', icon: 'link' as IconName, fill: BOOK_LOOK.own.fill },
] as const;

/** ⓘ in the bar: what a world book is, as three short points in a sheet (no helper text on the screen). */
export function LoreInfoButton() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <GlassButton icon="information-circle-outline" accessibilityLabel={t('lore.infoTitle')} onPress={() => setOpen(true)} />
      <Sheet visible={open} onClose={() => setOpen(false)} title={t('lore.infoTitle')}>
        <View style={styles.info}>
          {INFO.map((point) => (
            <View key={point.key} style={styles.point}>
              <Tile icon={point.icon} fill={point.fill} />
              <View style={styles.flex}>
                <Txt style={styles.pointTitle}>{t(`lore.info.${point.key}`)}</Txt>
                <Txt style={styles.pointText}>{t(`lore.info.${point.key}Text`)}</Txt>
              </View>
            </View>
          ))}
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { flexDirection: 'row', backgroundColor: colors.surface },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingLeft: space.lg, backgroundColor: colors.surface },
  // Beside a link mark, inside the row-direction wrap; a row straight in a group must not flex.
  grow: { flex: 1 },
  top: { alignItems: 'flex-start' },
  pressed: { backgroundColor: colors.surfaceAlt },
  tile: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tileTop: { paddingTop: 11 },
  body: { flex: 1, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingRight: 14, paddingVertical: 8 },
  entryBody: { paddingVertical: 10 },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  title: { fontSize: 17, letterSpacing: -0.4, color: colors.text },
  text: { marginTop: 2, fontSize: 15, lineHeight: 20, letterSpacing: -0.2, color: colors.text },
  hint: { marginTop: 3, fontSize: 13, lineHeight: 17, color: colors.textSecondary },
  side: { width: 56, alignItems: 'center', justifyContent: 'center' },
  art: { width: 44, height: 44, borderRadius: 10 },
  artBody: { minHeight: 64 },
  info: { gap: space.lg, paddingBottom: space.sm },
  point: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  pointTitle: { fontSize: 17, fontWeight: '600', letterSpacing: -0.4, color: colors.text },
  pointText: { marginTop: 2, fontSize: 15, lineHeight: 20, color: colors.textSecondary },
});
