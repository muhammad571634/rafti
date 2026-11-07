import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Linking, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HELPLINE_URL } from '@/ai/safety';
import { artLook, DateTicket, TicketBadge } from '@/components/date/ticket';
import { Button, GlassButton, glassStyle, PressableScale, Screen, SystemSegmented, Txt } from '@/components/ui';
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
import { colors, space } from '@/theme';

/**
 * Make or edit one of the user's own dates (canvas "DateMake", 2026-10-22): an iOS form under a
 * live Wallet ticket that shows the date as it will sit on the Dates screen — the scene it starts
 * with, the place, the look, rounds, mood and who it is for. Free to make; each play costs
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

  const onlyName = only ? shortName(displayName(only, relationships[only.id])) : '';
  const onlyLevel = only ? (relationships[only.id]?.level ?? 0) : undefined;
  const problem = checkTheme({ scene, title });
  const ready = (!problem || problem === 'crisis') && !crisis;
  const look = artLook(art);
  const cost = themeCost(rounds);

  const save = () => {
    const result = saveDateTheme(
      { scene, title, art, rounds, mood, characterId: forOne && only ? only.id : undefined },
      editing?.id,
    );
    if (result.status === 'crisis') return setCrisis(true);
    if (result.status === 'saved') router.back();
  };

  const moodNote =
    MOOD_LEVEL[mood] === 0
      ? t('dateTheme.moodNote.anyone')
      : onlyLevel != null && onlyLevel < MOOD_LEVEL[mood]
        ? t('dateTheme.moodNote.locked', { level: MOOD_LEVEL[mood] })
        : t('dateTheme.moodNote.from', { level: MOOD_LEVEL[mood] });

  const label = (text: string) => <Txt style={styles.sectionLabel}>{text}</Txt>;

  return (
    <Screen background={colors.bg}>
      <View style={styles.bar}>
        <GlassButton label={t('common.cancel')} onPress={() => router.back()} />
        <Txt style={styles.barTitle} lines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {editing ? t('dateTheme.titleEdit') : t('dateTheme.titleNew')}
        </Txt>
        <PressableScale
          scaleTo={0.94}
          disabled={!ready}
          onPress={save}
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready }}
          style={[ready ? styles.saveOn : glassStyle, styles.save]}>
          <Txt style={[styles.saveText, { color: ready ? colors.bg : colors.textFaint }]}>{t('dateTheme.save')}</Txt>
        </PressableScale>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.ticket}>
            <DateTicket
              look={look}
              name={title.trim() || t('dateTheme.yourDate')}
              headLabel={t('dateTheme.shells')}
              headValue={String(cost)}
              kind={t('dateTheme.kind')}
              title={title.trim() || t('dateTheme.yourDate')}
              fields={[
                { label: t('dateTheme.rounds'), value: String(rounds) },
                { label: t('dateTheme.mood'), value: t(`dating.moods.${mood}`) },
                { label: t('dateTheme.with'), value: forOne && only ? onlyName : t('dateTheme.anyone') },
              ]}
              footer={
                <View style={styles.preview} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                  <Txt style={styles.previewText}>{t('dateTheme.preview')}</Txt>
                </View>
              }
            />
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

          {label(t('dateTheme.scene'))}
          <View style={[styles.card, styles.sceneCard]}>
            <TextInput
              value={scene}
              onChangeText={(text) => {
                setCrisis(false);
                setScene(text);
              }}
              placeholder={t('dateTheme.scenePlaceholder')}
              placeholderTextColor={colors.textMuted}
              accessibilityLabel={t('dateTheme.scene')}
              maxLength={SCENE_MAX}
              multiline
              textAlignVertical="top"
              style={[styles.input, styles.sceneInput]}
            />
            <Txt style={styles.count}>
              {scene.length} / {SCENE_MAX}
            </Txt>
          </View>

          {label(t('dateTheme.where'))}
          <View style={[styles.card, styles.whereCard]}>
            <TextInput
              value={title}
              onChangeText={(text) => {
                setCrisis(false);
                setTitle(text);
              }}
              placeholder={t('dateTheme.wherePlaceholder')}
              placeholderTextColor={colors.textMuted}
              accessibilityLabel={t('dateTheme.where')}
              maxLength={TITLE_MAX}
              style={styles.input}
            />
          </View>

          {label(t('dateTheme.picture'))}
          <View style={[styles.card, styles.looks]}>
            {THEME_ARTS.map((a) => {
              const on = a.id === art;
              return (
                <PressableScale
                  key={a.id}
                  onPress={() => setArt(a.id)}
                  scaleTo={0.9}
                  accessibilityRole="button"
                  accessibilityLabel={t(`dateTheme.arts.${a.labelKey}`)}
                  accessibilityState={{ selected: on }}
                  style={[styles.lookRing, on && styles.lookRingOn]}>
                  <TicketBadge look={artLook(a.id)} size={46} />
                </PressableScale>
              );
            })}
          </View>

          {label(t('dateTheme.rounds'))}
          <SystemSegmented
            options={ROUND_OPTIONS.map((n) => ({ value: n, label: String(n) }))}
            value={rounds}
            onChange={(n) => setRounds(n)}
            style={styles.segmented}
          />

          {label(t('dateTheme.mood'))}
          <SystemSegmented
            options={DATE_MOODS.map((m) => ({
              value: m,
              label: t(`dating.moods.${m}`),
              locked: onlyLevel != null && onlyLevel < MOOD_LEVEL[m],
            }))}
            value={mood}
            onChange={(m) => setMood(m)}
            style={styles.segmented}
          />
          <Txt style={styles.note}>{moodNote}</Txt>

          {only ? (
            <>
              {label(t('dateTheme.who'))}
              <SystemSegmented
                options={[
                  { value: 'one', label: t('dateTheme.only', { name: onlyName }) },
                  { value: 'any', label: t('dateTheme.anyFriend') },
                ]}
                value={forOne ? 'one' : 'any'}
                onChange={(v) => setForOne(v === 'one')}
                style={styles.segmented}
              />
            </>
          ) : null}

          <Txt style={styles.footer}>{t('dateTheme.saveHint', { count: cost })}</Txt>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: space.xs,
    paddingBottom: space.sm,
  },
  barTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', letterSpacing: -0.4, color: colors.text },
  save: { height: 44, paddingHorizontal: 18, borderRadius: 22, justifyContent: 'center' },
  saveOn: { backgroundColor: colors.text },
  saveText: { fontSize: 17, fontWeight: '700', letterSpacing: -0.4 },
  ticket: { marginTop: space.sm, marginHorizontal: space.lg, borderRadius: 16, shadowColor: colors.black, shadowOpacity: 0.16, shadowRadius: 15, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  preview: { height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  previewText: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
  sectionLabel: {
    marginTop: 22,
    marginBottom: 6,
    marginHorizontal: space.lg * 2,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  card: { marginHorizontal: space.lg, borderRadius: 14, backgroundColor: colors.surface },
  sceneCard: { paddingHorizontal: space.lg, paddingVertical: 12 },
  whereCard: { height: 48, paddingHorizontal: space.lg, justifyContent: 'center' },
  input: { padding: 0, fontSize: 17, letterSpacing: -0.4, color: colors.text },
  sceneInput: { minHeight: 88, lineHeight: 22 },
  count: { alignSelf: 'flex-end', fontSize: 12, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  looks: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 14 },
  // The chosen look gets an ink ring with a gap, as iOS colour pickers do.
  lookRing: { padding: 2, borderRadius: 27, borderWidth: 2, borderColor: 'transparent' },
  lookRingOn: { borderColor: colors.text },
  segmented: { marginHorizontal: space.lg },
  note: { marginTop: 6, marginHorizontal: space.lg * 2, fontSize: 13, color: colors.textSecondary },
  footer: { marginTop: 22, marginHorizontal: space.lg, textAlign: 'center', fontSize: 13, color: colors.textSecondary },
  crisis: {
    marginTop: space.lg,
    marginHorizontal: space.lg,
    gap: space.sm,
    padding: space.lg,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'flex-start',
  },
});
