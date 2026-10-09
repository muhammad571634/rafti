import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { BrandArt, Button, Sheet, Txt } from '@/components/ui';
import { colors, radius, space } from '@/theme';

/**
 * "How their diary works": one picture, one title, one sentence, one button.
 * The picture is Rafti's sticker until the diary moment art is drawn.
 */
export function DiaryRulesSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={styles.moment}>
        <BrandArt name="sticker" width={128} bob />
      </View>
      <Txt variant="h2" center style={styles.title}>
        {t('diary.rulesTitle')}
      </Txt>
      <Txt variant="body" color={colors.textSecondary} center style={styles.body}>
        {t('diary.rulesBody')}
      </Txt>
      <Button label={t('diary.gotIt')} size="lg" full onPress={onClose} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  moment: {
    height: 160,
    borderRadius: radius.xl,
    backgroundColor: colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { marginTop: space.xl },
  body: { marginTop: space.sm, marginBottom: space.xl, paddingHorizontal: space.lg },
});
