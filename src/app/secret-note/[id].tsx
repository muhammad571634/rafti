import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { KeyboardAvoidingView, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PaywallSheet } from '@/components/paywall-sheet';
import { OpenedNote } from '@/components/secret-note/opened-note';
import { FeatureBar } from '@/components/feature/feature-kit';
import { InkText, PillButton } from '@/components/ink';
import { Anim, CharacterAvatar, EmptyState, PressableScale, Screen, ShellIcon } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { shellCosts } from '@/mock';
import { localSecretNote } from '@/i18n/content';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, friendAccent, space } from '@/theme';
import { ink, inkFace, inkGutter, inkRadius } from '@/theme/ink';

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
      <Screen background={ink.ground}>
        {bar}
        <InkText variant="display" style={styles.emptyTitle}>
          {t('secretNote.title')}
        </InkText>
        {/* No such friend any more (deleted, blocked, an old link); with one, the note is being made. */}
        {!character ? (
          <EmptyState symbol={{ ios: 'envelope.open', icon: 'mail-open-outline' }} title={t('secretNote.gone')} actionLabel={t('common.back')} onAction={() => router.back()} />
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
    if (result === 'ok') {
      haptic.success();
      setJustOpened(true);
    }
  };

  const face = (
    <View style={[styles.ring, { borderColor: accent.strong }]}>
      <CharacterAvatar character={character} size={40} />
    </View>
  );

  return (
    <Screen background={ink.ground}>
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
                <InkText variant="body" color={ink.text2}>
                  {t('secretNote.newQuestion')}
                </InkText>
              </PressableScale>
            ) : undefined
          }
        />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl }} keyboardShouldPersistTaps="handled">
          <InkText variant="footnote" style={styles.kicker}>
            {t('secretNote.question')}
          </InkText>
          <InkText variant="title" accessibilityRole="header" style={styles.question}>
            {note.prompt}
          </InkText>

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
                <InkText variant="sub" style={styles.flex}>
                  {t('games.busy', { name })}
                </InkText>
                <PressableScale scaleTo={0.95} accessibilityRole="button" onPress={() => retrySecretNote(note.id)}>
                  <InkText variant="subStrong" color={accent.strong}>
                    {t('common.retry')}
                  </InkText>
                </PressableScale>
              </View>
            ) : (
              <Animated.View entering={FadeIn.duration(220)} style={styles.cardPad}>
                <View style={styles.cardTop}>
                  <InkText variant="footnote" lines={1} style={styles.flex}>
                    {composing ? t('secretNote.thinking') : t('secretNote.sealedTitle', { name })}
                  </InkText>
                  {composing ? <Anim name="typing" size={24} tint={accent.strong} /> : <Ionicons name="lock-closed-outline" size={20} color={ink.text2} />}
                </View>
                <View style={styles.cardBottom}>
                  <InkText variant="cardSmall" lines={2} style={styles.flex}>
                    {t('secretNote.sealedHint')}
                  </InkText>
                  {face}
                </View>
              </Animated.View>
            )}
          </Animated.View>

          <Animated.View layout={GLIDE} style={styles.labelRow}>
            <InkText variant="footnote">{t('secretNote.yourNote')}</InkText>
            <InkText variant="footnote" style={styles.count}>{`${note.myNote.length} / ${MAX_LENGTH}`}</InkText>
          </Animated.View>
          <Animated.View layout={GLIDE} style={styles.field}>
            <TextInput
              value={note.myNote}
              onChangeText={(text) => writeNote(note.id, text.slice(0, MAX_LENGTH))}
              placeholder={t('secretNote.placeholder')}
              placeholderTextColor={ink.placeholder}
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
              <InkText variant="subStrong" color={colors.bondText}>
                {t('secretNote.exchanged')}
              </InkText>
            </Animated.View>
          ) : null}
        </ScrollView>

        {exchanged ? null : (
          <View style={[styles.foot, { paddingBottom: insets.bottom + space.md }]}>
            <PillButton label={t('secretNote.swap')} onPress={exchange} disabled={!canExchange} style={styles.swap} />
            <View style={styles.price}>
              <ShellIcon size={14} />
              <InkText variant="footnote" style={styles.count}>
                {String(shellCosts.secretNote)}
              </InkText>
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
  emptyTitle: { marginTop: 4, marginHorizontal: inkGutter },
  barLink: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  kicker: { marginTop: space.md, marginHorizontal: inkGutter },
  question: { marginTop: 6, marginHorizontal: inkGutter },
  card: {
    marginTop: 22,
    marginHorizontal: inkGutter,
    minHeight: 112,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
  },
  cardPad: { flex: 1, padding: 18, gap: 16, justifyContent: 'space-between' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardBottom: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  ring: { width: 48, height: 48, borderRadius: inkRadius.pill, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 26, marginHorizontal: inkGutter },
  count: { fontVariant: ['tabular-nums'] },
  field: { marginTop: 8, marginHorizontal: inkGutter, minHeight: 180, padding: 18, borderRadius: inkRadius.card, borderCurve: 'continuous', backgroundColor: ink.card },
  input: { minHeight: 144, padding: 0, ...inkFace('body'), color: ink.text },
  done: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 22 },
  foot: { paddingHorizontal: inkGutter, paddingTop: space.sm, alignItems: 'center', gap: 8 },
  swap: { alignSelf: 'stretch' },
  price: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
