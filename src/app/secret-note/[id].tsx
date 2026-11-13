import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PaywallSheet } from '@/components/paywall-sheet';
import { OpenedNote } from '@/components/secret-note/opened-note';
import { FeatureBar } from '@/components/feature/feature-kit';
import { Anim, CharacterAvatar, EmptyState, LargeTitle, PressableScale, Screen, ShellIcon, Txt } from '@/components/ui';
import { shellCosts } from '@/mock';
import { localSecretNote } from '@/i18n/content';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, fonts, friendAccent, isDark, space, systemGround } from '@/theme';

const MAX_LENGTH = 400;
/** Cards glide to their new height when a note opens or arrives (on-screen move: ease-in-out). */
const GLIDE = LinearTransition.duration(320).easing(Easing.bezier(0.77, 0, 0.175, 1));

/**
 * Secret Note: a daily question, two sealed notes. The character writes theirs first
 * ("Thinking..."), you write yours, and one swap opens both at once. The Ink look (owner, 2026-11-13,
 * from the canvas frame): the question large in serif, their note as a card washed in their colour
 * with a lock and their face, yours as a plain field with its count beside the label, and one wide
 * button with the price under it. "New question" sits in the bar once the notes are swapped.
 */
export default function SecretNoteScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const characterId = Array.isArray(id) ? id[0] : id;

  const { t } = useTranslation();

  const character = useAppStore((s) => s.characters.find((c) => c.id === characterId));
  const relationship = useAppStore((s) => (characterId ? s.relationships[characterId] : undefined));
  const notes = useAppStore((s) => s.notes);
  const ensureSecretNote = useAppStore((s) => s.ensureSecretNote);
  const newSecretNote = useAppStore((s) => s.newSecretNote);
  const writeNote = useAppStore((s) => s.writeNote);
  const exchangeNote = useAppStore((s) => s.exchangeNote);
  const retrySecretNote = useAppStore((s) => s.retrySecretNote);

  const [paywall, setPaywall] = useState<number | null>(null);
  const [justOpened, setJustOpened] = useState(false);

  const rawNote = useMemo(() => notes.find((n) => n.characterId === characterId), [notes, characterId]);
  const note = rawNote ? localSecretNote(rawNote) : undefined;

  useEffect(() => {
    if (characterId) ensureSecretNote(characterId);
  }, [characterId, ensureSecretNote]);

  const bar = <FeatureBar backLabel={t('common.back')} onBack={() => router.back()} />;

  if (!character || !note) {
    return (
      <Screen background={systemGround.ground}>
        {bar}
        <LargeTitle>{t('secretNote.title')}</LargeTitle>
        {/* No such friend any more (deleted, blocked, an old link); with one, the note is being made. */}
        {!character ? (
          <EmptyState title={t('secretNote.gone')} actionLabel={t('common.back')} onAction={() => router.back()} />
        ) : null}
      </Screen>
    );
  }

  const exchanged = note.status === 'exchanged';
  const composing = note.status === 'composing';
  const canExchange = note.status === 'ready' && note.myNote.trim().length > 0;
  const name = displayName(character, relationship);
  const accent = friendAccent(character.id);

  const exchange = () => {
    const result = exchangeNote(note.id);
    if (result === 'noShells') setPaywall(shellCosts.secretNote);
    if (result === 'ok') setJustOpened(true);
  };

  const face = (
    <View style={[styles.ring, { borderColor: accent.strong }]}>
      <CharacterAvatar character={character} size={40} />
    </View>
  );

  return (
    <Screen background={systemGround.ground}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <FeatureBar
          backLabel={t('common.back')}
          onBack={() => router.back()}
          right={
            exchanged ? (
              <PressableScale
                scaleTo={0.95}
                accessibilityRole="button"
                onPress={() => {
                  setJustOpened(false);
                  newSecretNote(character.id);
                }}
                style={styles.barLink}>
                <Txt style={styles.barLinkText} maxFontSizeMultiplier={1.3}>
                  {t('secretNote.newQuestion')}
                </Txt>
              </PressableScale>
            ) : undefined
          }
        />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl }} keyboardShouldPersistTaps="handled">
          <Txt style={styles.kicker} maxFontSizeMultiplier={1.3}>
            {t('secretNote.question')}
          </Txt>
          <Text style={styles.question} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
            {note.prompt}
          </Text>

          {/* Their note: washed in their colour, the lock while it is sealed, their face. */}
          <Animated.View layout={GLIDE} style={styles.card}>
            <LinearGradient colors={[`${accent.strong}55`, `${accent.strong}00`]} start={{ x: 0, y: 0.3 }} end={{ x: 0.8, y: 0.7 }} style={StyleSheet.absoluteFill} />
            {exchanged ? (
              <View style={styles.cardPad}>
                <OpenedNote
                  key={note.id}
                  text={note.theirNote ?? ''}
                  sealedTitle={t('secretNote.sealedTitle', { name })}
                  sealedHint={t('secretNote.sealedHint')}
                  reveal={justOpened}
                />
              </View>
            ) : composing && note.busy ? (
              <View style={[styles.cardPad, styles.row]}>
                <Txt style={[styles.muted, styles.flex]}>{t('games.busy', { name })}</Txt>
                <PressableScale scaleTo={0.95} accessibilityRole="button" onPress={() => retrySecretNote(note.id)}>
                  <Txt style={[styles.retry, { color: accent.strong }]}>{t('common.retry')}</Txt>
                </PressableScale>
              </View>
            ) : (
              <Animated.View entering={FadeIn.duration(220)} style={styles.cardPad}>
                <View style={styles.cardTop}>
                  <Txt style={styles.cardLabel} lines={1}>
                    {composing ? t('secretNote.thinking') : t('secretNote.sealedTitle', { name })}
                  </Txt>
                  {composing ? <Anim name="typing" size={24} tint={accent.strong} /> : <Ionicons name="lock-closed-outline" size={20} color={systemGround.secondaryLabel} />}
                </View>
                <View style={styles.cardBottom}>
                  <Text style={styles.cardTitle} numberOfLines={2} maxFontSizeMultiplier={1.3}>
                    {t('secretNote.sealedHint')}
                  </Text>
                  {face}
                </View>
              </Animated.View>
            )}
          </Animated.View>

          <Animated.View layout={GLIDE} style={styles.labelRow}>
            <Txt style={styles.label}>{t('secretNote.yourNote')}</Txt>
            <Txt style={styles.label}>{`${note.myNote.length} / ${MAX_LENGTH}`}</Txt>
          </Animated.View>
          <Animated.View layout={GLIDE} style={styles.field}>
            <TextInput
              value={note.myNote}
              onChangeText={(text) => writeNote(note.id, text.slice(0, MAX_LENGTH))}
              placeholder={t('secretNote.placeholder')}
              placeholderTextColor={systemGround.secondaryLabel}
              selectionColor={accent.strong}
              style={styles.input}
              multiline
              editable={!exchanged}
              textAlignVertical="top"
              accessibilityLabel={t('secretNote.yourNote')}
            />
          </Animated.View>

          {exchanged ? (
            <Animated.View entering={justOpened ? FadeInDown.delay(560).duration(320).easing(Easing.bezier(0.23, 1, 0.32, 1)) : undefined} style={styles.done}>
              <Ionicons name="checkmark-circle" size={18} color={colors.bondText} />
              <Txt style={styles.doneText}>{t('secretNote.exchanged')}</Txt>
            </Animated.View>
          ) : null}
        </ScrollView>

        {exchanged ? null : (
          <View style={[styles.foot, { paddingBottom: insets.bottom + space.md }]}>
            <PressableScale scaleTo={0.97} accessibilityRole="button" accessibilityState={{ disabled: !canExchange }} disabled={!canExchange} onPress={exchange} style={[styles.swap, !canExchange && styles.swapOff]}>
              <Txt style={[styles.swapText, !canExchange && styles.swapTextOff]} maxFontSizeMultiplier={1.3}>
                {t('secretNote.swap')}
              </Txt>
            </PressableScale>
            <View style={styles.price}>
              <ShellIcon size={14} />
              <Txt style={styles.priceText}>{String(shellCosts.secretNote)}</Txt>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      <PaywallSheet need={paywall} onClose={() => setPaywall(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  barLink: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  barLinkText: { fontSize: 16, color: systemGround.secondaryLabel },
  kicker: { marginTop: space.md, marginHorizontal: 20, fontSize: 14, color: systemGround.secondaryLabel },
  question: { marginTop: 6, marginHorizontal: 20, fontFamily: fonts.serif, fontSize: 32, lineHeight: 39, letterSpacing: -0.5, color: systemGround.label },
  card: {
    marginTop: 22,
    marginHorizontal: 20,
    minHeight: 112,
    borderRadius: 28,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: systemGround.card,
    ...(isDark ? { borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.08)' } : null),
  },
  cardPad: { flex: 1, padding: 18, gap: 16, justifyContent: 'space-between' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardLabel: { flex: 1, fontSize: 14, color: systemGround.secondaryLabel },
  cardBottom: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  cardTitle: { flex: 1, fontFamily: fonts.serif, fontSize: 20, lineHeight: 25, letterSpacing: -0.2, color: systemGround.label },
  ring: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  muted: { fontSize: 14, lineHeight: 19, color: systemGround.secondaryLabel },
  retry: { fontSize: 15, fontWeight: '700' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 26, marginHorizontal: 20 },
  label: { fontSize: 14, color: systemGround.secondaryLabel, fontVariant: ['tabular-nums'] },
  field: { marginTop: 8, marginHorizontal: 20, minHeight: 180, padding: 18, borderRadius: 28, borderCurve: 'continuous', backgroundColor: systemGround.card },
  input: { minHeight: 144, padding: 0, fontSize: 17, lineHeight: 24, letterSpacing: -0.3, color: systemGround.label },
  done: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 22 },
  doneText: { fontSize: 15, fontWeight: '600', color: colors.bondText },
  foot: { paddingHorizontal: 20, paddingTop: space.sm, alignItems: 'center', gap: 8 },
  swap: { alignSelf: 'stretch', height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: systemGround.label },
  swapOff: { backgroundColor: systemGround.fill },
  swapText: { fontSize: 16, fontWeight: '600', color: systemGround.ground },
  swapTextOff: { color: systemGround.secondaryLabel },
  price: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priceText: { fontSize: 14, color: systemGround.secondaryLabel, fontVariant: ['tabular-nums'] },
});
