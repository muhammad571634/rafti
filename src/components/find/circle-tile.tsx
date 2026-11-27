import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { InkText, tileTint } from '@/components/ink';
import { CharacterAvatar, PressableScale } from '@/components/ui';
import { phrase } from '@/i18n';
import type { CharacterGroup } from '@/mock';
import { ink, inkRadius } from '@/theme/ink';

const FACE = 34;

export interface CircleTileProps {
  group: CharacterGroup;
  index: number;
  width: number;
  onOpen: (group: CharacterGroup) => void;
}

/**
 * Sleek 2x2 editorial Circle tile on Find (approved Ink+ prototype): replaces manila folder tabs
 * with Sigmazam's deep `inkTints` gradient, overlapping ringed member portraits, head count, and
 * a crisp serif circle name (zero helper subtitles).
 */
export const CircleTile = memo(function CircleTile({ group, index, width, onOpen }: CircleTileProps) {
  const { t } = useTranslation();
  const [from, to] = tileTint(index);
  const name = phrase(group.series);
  const faces = group.characters.slice(0, 3);

  return (
    <PressableScale
      scaleTo={0.96}
      accessibilityRole="button"
      accessibilityLabel={t('find.openWorld', { world: name })}
      onPress={() => onOpen(group)}
      style={[styles.tile, { width }]}>
      <LinearGradient colors={[from, to]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.top}>
        <View style={styles.faces}>
          {faces.map((c, i) => (
            <View key={c.id} style={[styles.ring, i > 0 && styles.overlap, { borderColor: from, backgroundColor: from }]}>
              <CharacterAvatar character={c} size={FACE} />
            </View>
          ))}
        </View>
        <InkText variant="caption" color="rgba(255,255,255,0.58)" style={styles.tabular}>
          {group.characters.length}
        </InkText>
      </View>

      <InkText variant="cardSmall" color={ink.text} lines={2} wordSafe>
        {name}
      </InkText>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  tile: {
    minHeight: 118,
    borderRadius: 24,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 14,
    justifyContent: 'space-between',
    gap: 16,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  faces: { flexDirection: 'row', alignItems: 'center' },
  ring: {
    borderWidth: 2,
    borderRadius: inkRadius.pill,
    overflow: 'hidden',
  },
  overlap: { marginLeft: -10 },
  tabular: { fontVariant: ['tabular-nums'] },
});
