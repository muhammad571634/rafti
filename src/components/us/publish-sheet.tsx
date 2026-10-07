import { BookOpenTextIcon } from 'phosphor-react-native/src/icons/BookOpenText';
import { CalendarPlusIcon } from 'phosphor-react-native/src/icons/CalendarPlus';
import { PushPinIcon } from 'phosphor-react-native/src/icons/PushPin';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { IconTile, PressableScale, Sheet, Txt, type TileIcon } from '@/components/ui';
import { colors, space } from '@/theme';

export type PublishKind = 'plan' | 'diary' | 'board';

const OPTIONS: { kind: PublishKind; icon: TileIcon }[] = [
  { kind: 'plan', icon: CalendarPlusIcon },
  { kind: 'diary', icon: BookOpenTextIcon },
  { kind: 'board', icon: PushPinIcon },
];

/** The [Us] "+": add a plan, write a diary page or pin a note on the board. */
export function PublishSheet({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (kind: PublishKind) => void;
}) {
  const { t } = useTranslation();
  return (
    <Sheet visible={visible} onClose={onClose} title={t('us.publish')}>
      <View style={styles.row}>
        {OPTIONS.map(({ kind, icon }) => (
          <PressableScale key={kind} style={styles.option} scaleTo={0.94} onPress={() => onPick(kind)}>
            <IconTile icon={icon} size={60} glyphSize={28} />
            <Txt variant="smallStrong" color={colors.textSecondary}>
              {t(`us.publishKind.${kind}`)}
            </Txt>
          </PressableScale>
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: space.md },
  option: { alignItems: 'center', gap: space.sm, minWidth: 88 },
});
