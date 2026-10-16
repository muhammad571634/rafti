import { Ionicons } from '@expo/vector-icons';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { BrandArt, Button, Sheet, Txt } from '@/components/ui';
import { colors, space } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** The three ways a page comes about, in the order they happen. */
const STEPS: { key: 'chat' | 'date' | 'share'; icon: IconName }[] = [
  { key: 'chat', icon: 'chatbubble-outline' },
  { key: 'date', icon: 'heart-outline' },
  { key: 'share', icon: 'book-outline' },
];

/**
 * "How the diary works" (calm cards, docs/design-style.md): Rafti's sticker, a title and
 * one bordered box with three steps, then one button.
 */
export function DiaryRulesSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={styles.head}>
        <BrandArt name="sticker" width={76} bob />
        <Txt variant="h2" center>
          {t('diary.rulesTitle')}
        </Txt>
      </View>

      <View style={styles.box}>
        {STEPS.map(({ key, icon }, index) => (
          <Fragment key={key}>
            {index > 0 ? <View style={styles.divider} /> : null}
            <View style={styles.step}>
              <View style={styles.tile}>
                <Ionicons name={icon} size={20} color={colors.text} />
              </View>
              <View style={styles.flex}>
                <Txt variant="bodyStrong">{t(`diary.rules.${key}`)}</Txt>
                <Txt variant="small" color={colors.textSecondary}>
                  {t(`diary.rules.${key}Body`)}
                </Txt>
              </View>
            </View>
          </Fragment>
        ))}
      </View>

      <Button label={t('diary.gotIt')} size="lg" full onPress={onClose} />
    </Sheet>
  );
}

const TILE = 40;

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  head: { alignItems: 'center', gap: space.sm },
  box: {
    marginTop: space.lg,
    marginBottom: space.lg,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  step: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: 14, paddingVertical: space.sm },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 14 + TILE + space.md },
});
