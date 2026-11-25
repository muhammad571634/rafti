import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { InkText } from '@/components/ink';
import { PressableScale, SFIcon, Sheet } from '@/components/ui';
import { ink, inkRadius, inkTints } from '@/theme/ink';

export type TogetherKind = 'photoBooth' | 'quiz' | 'board' | 'scene';

interface Option {
  kind: TogetherKind;
  ios: SFSymbol;
  icon: keyof typeof Ionicons.glyphMap;
  fill: string;
}

const OPTIONS: readonly Option[] = [
  { kind: 'photoBooth', ios: 'camera.fill', icon: 'camera', fill: inkTints[0][0] },
  { kind: 'quiz', ios: 'sparkles', icon: 'sparkles', fill: inkTints[4][0] },
  { kind: 'board', ios: 'pin.fill', icon: 'pin', fill: inkTints[1][0] },
  { kind: 'scene', ios: 'film.fill', icon: 'film', fill: inkTints[5][0] },
];

export interface TogetherSheetProps {
  visible: boolean;
  onClose: () => void;
  name: string;
  canScene: boolean;
  onPick: (kind: TogetherKind) => void;
}

/**
 * Friend-scoped "Together" sheet on Us (replaces the old global MoreSheet that mixed in Radio,
 * Streams, Lore and Personas): four deep Ink-tinted cards matching PublishSheet, each opening the
 * existing full-screen Photo Booth, Couple Quiz, Message Board, or Scene picker for this friend.
 */
export function TogetherSheet({ visible, onClose, name, canScene, onPick }: TogetherSheetProps) {
  const { t } = useTranslation();

  const titleOf = (kind: TogetherKind): string => {
    switch (kind) {
      case 'photoBooth':
        return t('photoBooth.title');
      case 'quiz':
        return t('chat.attachments.quiz');
      case 'board':
        return t('board.title');
      case 'scene':
        return t('chat.attachments.scene');
    }
  };

  const hintOf = (kind: TogetherKind): string => t(`us.togetherHint.${kind}`, { name });

  const shown = OPTIONS.filter((o) => canScene || o.kind !== 'scene');

  return (
    <Sheet visible={visible} onClose={onClose} title={t('us.togetherWith', { name })} scroll>
      <View style={styles.tiles}>
        {shown.map(({ kind, ios, icon, fill }) => (
          <PressableScale
            key={kind}
            scaleTo={0.97}
            onPress={() => onPick(kind)}
            accessibilityRole="button"
            accessibilityLabel={`${titleOf(kind)}, ${hintOf(kind)}`}
            style={[styles.tile, { backgroundColor: fill }]}>
            <View style={styles.icon}>
              <SFIcon ios={ios} icon={icon} size={22} color={ink.text} />
            </View>
            <View style={styles.text}>
              <InkText variant="bodyStrong" lines={2}>
                {titleOf(kind)}
              </InkText>
              <InkText variant="footnote" lines={2}>
                {hintOf(kind)}
              </InkText>
            </View>
            <Ionicons name="chevron-forward" size={17} color={ink.text2} />
          </PressableScale>
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  tiles: { gap: 10 },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: inkRadius.field,
    borderCurve: 'continuous',
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: inkRadius.chip,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ink.raised,
  },
  text: { flex: 1, minWidth: 0, gap: 2 },
});
