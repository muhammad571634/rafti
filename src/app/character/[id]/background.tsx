import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Header, PressableScale, Screen, Txt } from '@/components/ui';
import { chatBackgrounds } from '@/mock';
import { useAppStore } from '@/store/use-app-store';
import { colors, radius, space } from '@/theme';

export default function ChangeBackgroundScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const characterId = Array.isArray(id) ? id[0] : id;

  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const relationship = useAppStore((s) => (characterId ? s.relationships[characterId] : undefined));
  const setBackground = useAppStore((s) => s.setBackground);

  const tileWidth = (width - space.lg * 2 - space.md) / 2;

  return (
    <Screen background={colors.bgPlain}>
      <Header title={t('background.title')} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.grid}>
          {chatBackgrounds.map((background) => {
            const selected = relationship?.backgroundId === background.id;

            return (
              <PressableScale
                key={background.id}
                style={{ width: tileWidth }}
                scaleTo={0.95}
                onPress={() => {
                  if (characterId) setBackground(characterId, background.id);
                  router.back();
                }}>
                <LinearGradient
                  colors={background.colors}
                  style={[
                    styles.tile,
                    { height: tileWidth * 1.5 },
                    selected && styles.tileSelected,
                  ]}>
                  {selected ? (
                    <View style={styles.check}>
                      <Ionicons name="checkmark" size={15} color={colors.textOnPrimary} />
                    </View>
                  ) : null}
                </LinearGradient>
                <Txt variant="small" center style={styles.label}>
                  {t(`background.${background.nameKey}`)}
                </Txt>
              </PressableScale>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space.lg, paddingBottom: space.huge },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  tile: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.sm,
    alignItems: 'flex-end',
  },
  tileSelected: { borderWidth: 2, borderColor: colors.text },
  check: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { marginTop: space.sm },
});
