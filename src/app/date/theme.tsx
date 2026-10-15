import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HELPLINE_URL } from '@/ai/safety';
import { Button, ClayIcon, Header, PressableScale, Screen, Txt } from '@/components/ui';
import { shortName } from '@/lib/format';
import {
  DATE_MOODS,
  MOOD_LEVEL,
  ROUND_OPTIONS,
  SCENE_MAX,
  TITLE_MAX,
  checkTheme,
  themeCost,
  type DateMood,
  type ThemeRounds,
} from '@/lib/date-themes';
import { THEME_ARTS } from '@/mock/date-themes';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, radius, space, type } from '@/theme';

/**
 * Make or edit one of the user's own dates (F28, approved prototype): the scene it starts
 * with, the place, a picture, rounds, mood and who it is for. Free to make; each play costs
 * 2 shells a round. `partner` is the friend picked on the map; `id` edits a saved date.
 */
export default function DateThemeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; partner?: string }>();
  const editing = useAppStore((s) => s.dateThemes.find((d) => d.id === params.id));
  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);
  const saveDateTheme = useAppStore((s) => s.saveDateTheme);

  const [scene, setScene] = useState(editing?.scene ?? '');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [art, setArt] = useState(editing?.art ?? THEME_ARTS[0].id);
  const [rounds, setRounds] = useState<ThemeRounds>(editing?.rounds ?? 5);
  const [mood, setMood] = useState<DateMood>(editing?.mood ?? 'friendly');
  // The friend it can be "only" for: the one it was saved with, else the map's partner.
  const onlyId = editing?.characterId ?? params.partner;
  const only = characters.find((c) => c.id === onlyId);
  const [forOne, setForOne] = useState(editing ? !!editing.characterId : !!only);
  const [crisis, setCrisis] = useState(false);

  const problem = checkTheme({ scene, title });
  const ready = !problem || problem === 'crisis';

  const save = () => {
    const result = saveDateTheme(
      { scene, title, art, rounds, mood, characterId: forOne && only ? only.id : undefined },
      editing?.id,
    );
    if (result.status === 'crisis') return setCrisis(true);
    if (result.status === 'saved') router.back();
  };

  const label =
    problem === 'noScene'
      ? t('dateTheme.needScene')
      : problem === 'noTitle'
        ? t('dateTheme.needTitle')
        : t('dateTheme.save');

  return (
    <Screen background={colors.bgPlain}>
      <Header title={editing ? t('dateTheme.titleEdit') : t('dateTheme.titleNew')} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.section}>
            <Txt variant="h3">{t('dateTheme.scene')}</Txt>
            <TextInput
              value={scene}
              onChangeText={(text) => {
                setCrisis(false);
                setScene(text);
              }}
              placeholder={t('dateTheme.scenePlaceholder')}
              placeholderTextColor={colors.textFaint}
              accessibilityLabel={t('dateTheme.scene')}
              maxLength={SCENE_MAX}
              multiline
              textAlignVertical="top"
              style={[styles.input, styles.scene]}
            />
            <Txt variant="small" color={colors.textSecondary}>
              {t('dateTheme.sceneHint')}
            </Txt>
          </View>

          {crisis ? (
            <View style={styles.crisis} accessibilityLiveRegion="polite">
              <Txt variant="title">{t('dateTheme.crisisTitle')}</Txt>
              <Txt variant="small" color={colors.textSecondary}>
                {t('dateTheme.crisisBody')}
              </Txt>
              <Button
                label={t('safety.helplineAction')}
                variant="secondary"
                size="sm"
                onPress={() => void Linking.openURL(HELPLINE_URL)}
              />
            </View>
          ) : null}

          <View style={styles.section}>
            <Txt variant="h3">{t('dateTheme.where')}</Txt>
            <TextInput
              value={title}
              onChangeText={(text) => {
                setCrisis(false);
                setTitle(text);
              }}
              placeholder={t('dateTheme.wherePlaceholder')}
              placeholderTextColor={colors.textFaint}
              accessibilityLabel={t('dateTheme.where')}
              maxLength={TITLE_MAX}
              style={styles.input}
            />
          </View>

          <View style={styles.section}>
            <Txt variant="h3">{t('dateTheme.picture')}</Txt>
            <View style={styles.row}>
              {THEME_ARTS.map((a) => {
                const on = a.id === art;
                return (
                  <PressableScale
                    key={a.id}
                    onPress={() => setArt(a.id)}
                    scaleTo={0.94}
                    accessibilityRole="button"
                    accessibilityLabel={t(`dateTheme.arts.${a.labelKey}`)}
                    accessibilityState={{ selected: on }}
                    style={[styles.option, styles.artOption, on && styles.optionOn]}>
                    <ClayIcon name={a.id} size={34} tile={false} />
                  </PressableScale>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Txt variant="h3">{t('dateTheme.rounds')}</Txt>
            <View style={styles.row}>
              {ROUND_OPTIONS.map((n) => (
                <Option
                  key={n}
                  on={rounds === n}
                  label={String(n)}
                  hint={t(`dateTheme.roundHint.${n}`)}
                  onPress={() => setRounds(n)}
                />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Txt variant="h3">{t('dateTheme.mood')}</Txt>
            <View style={styles.row}>
              {DATE_MOODS.map((m) => (
                <Option
                  key={m}
                  on={mood === m}
                  label={t(`dating.moods.${m}`)}
                  hint={t(`dateTheme.moodHint.${m}`, { level: MOOD_LEVEL[m] })}
                  onPress={() => setMood(m)}
                />
              ))}
            </View>
          </View>

          {only ? (
            <View style={styles.section}>
              <Txt variant="h3">{t('dateTheme.who')}</Txt>
              <View style={styles.row}>
                <Option
                  on={forOne}
                  label={t('dateTheme.only', { name: shortName(displayName(only, relationships[only.id])) })}
                  onPress={() => setForOne(true)}
                />
                <Option on={!forOne} label={t('dateTheme.anyFriend')} onPress={() => setForOne(false)} />
              </View>
            </View>
          ) : null}
        </ScrollView>

        {/* Action bar (docs/design-style.md §3): the button, then what it costs. */}
        <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
          <Button label={label} size="lg" full disabled={!ready || crisis} onPress={save} />
          <Txt variant="caption" color={colors.textSecondary} center>
            {t('dateTheme.saveHint', { count: themeCost(rounds) })}
          </Txt>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

/** An option chip (docs/design-style.md §4): grey fill, white with an ink border when chosen. */
function Option({ on, label, hint, onPress }: { on: boolean; label: string; hint?: string; onPress: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.96}
      accessibilityRole="button"
      accessibilityLabel={hint ? `${label}, ${hint}` : label}
      accessibilityState={{ selected: on }}
      style={[styles.option, on && styles.optionOn]}>
      <Txt variant="bodyStrong" lines={1}>
        {label}
      </Txt>
      {hint ? (
        <Txt variant="caption" color={colors.textSecondary} lines={1}>
          {hint}
        </Txt>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.xxl, gap: space.xl },
  section: { gap: space.sm + 2 },
  row: { flexDirection: 'row', gap: space.sm },
  input: {
    minHeight: 52,
    paddingHorizontal: space.md + 2,
    paddingVertical: space.sm,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    ...type.body,
  },
  scene: { minHeight: 112, paddingTop: space.md },
  option: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xs,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.surfaceAlt,
  },
  artOption: { paddingHorizontal: 0 },
  optionOn: { backgroundColor: colors.surface, borderColor: colors.text },
  crisis: {
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.tile,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'flex-start',
  },
  actionBar: {
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
