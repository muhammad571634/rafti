import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LanguageList, pickLanguage } from '@/components/profile/language-list';
import { GlassBar, LargeTitle, Screen, useScrolledPast } from '@/components/ui';
import { getSavedLocaleSync } from '@/i18n';
import { colors, space } from '@/theme';

/** Profile → Language, an iOS Settings page: the choice applies at once and the page stays open. */
export default function LanguageScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { scrolled, onScroll } = useScrolledPast(40);
  const [value, setValue] = useState(getSavedLocaleSync);

  const pick = async (code: string | null) => {
    setValue(code);
    await pickLanguage(code);
  };

  return (
    <Screen background={colors.bg}>
      <GlassBar title={t('profile.language')} scrolled={scrolled} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.huge }}>
        <LargeTitle>{t('profile.language')}</LargeTitle>
        <View style={styles.list}>
          <LanguageList value={value} onPick={(code) => void pick(code)} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: space.md },
});
