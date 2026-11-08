import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PaywallSheet } from '@/components/paywall-sheet';
import { OpenedNote, SealedRow } from '@/components/secret-note/opened-note';
import { featureStyles, FeatureBar } from '@/components/feature/feature-kit';
import { BUY_BAR_SPACE, GroupLabel, StoreBuyBar } from '@/components/plans/store-look';
import { Anim, CharacterAvatar, EmptyState, LargeTitle, PressableScale, Screen, ShellIcon, Txt } from '@/components/ui';
import { shellCosts } from '@/mock';
import { localSecretNote } from '@/i18n/content';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, friendAccent, space, systemGround } from '@/theme';

const MAX_LENGTH = 400;
/** Cards glide to their new height when a note opens or arrives (on-screen move: ease-in-out). */
const GLIDE = LinearTransition.duration(320).easing(Easing.bezier(0.77, 0, 0.175, 1));

/**
 * Secret Note: a daily question, two sealed notes. The character writes theirs first
 * ("Thinking..."), you write yours, and one swap opens both at once. A friend's space on Apple's
 * white ground (design-style §10): the question as a grey card with the friend's face, their note
 * sealed in a card, yours as a field, their accent on what they do; the swap pays in shells, so it
 * keeps the Store's button.
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

  return (
    <Screen background={systemGround.ground}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: exchanged ? insets.bottom + space.xxl : BUY_BAR_SPACE + insets.bottom }}
          keyboardShouldPersistTaps="handled">
          {bar}
          <LargeTitle>{t('secretNote.title')}</LargeTitle>

          <View style={[featureStyles.card, styles.prompt]}>
            <CharacterAvatar character={character} size={44} />
            <Txt style={styles.promptLabel}>{t('secretNote.question')}</Txt>
            <Txt style={styles.promptText} center>
              {`“${note.prompt}”`}
            </Txt>
          </View>

          <GroupLabel>{t('secretNote.theirNote', { name })}</GroupLabel>
          <Animated.View layout={GLIDE} style={[featureStyles.card, styles.pad]}>
            {exchanged ? (
              <OpenedNote
                key={note.id}
                text={note.theirNote ?? ''}
                sealedTitle={t('secretNote.sealedTitle', { name })}
                sealedHint={t('secretNote.sealedHint')}
                reveal={justOpened}
              />
            ) : composing && note.busy ? (
              <View style={styles.row}>
                <Txt style={[styles.muted, styles.flex]}>{t('games.busy', { name })}</Txt>
                <PressableScale scaleTo={0.95} accessibilityRole="button" onPress={() => retrySecretNote(note.id)}>
                  <Txt style={[styles.againText, { color: accent.strong }]}>{t('common.retry')}</Txt>
                </PressableScale>
              </View>
            ) : composing ? (
              <View style={styles.row}>
                <Anim name="typing" size={26} tint={accent.strong} />
                <Txt style={styles.muted}>{t('secretNote.thinking')}</Txt>
              </View>
            ) : (
              <Animated.View entering={FadeIn.duration(220)}>
                <SealedRow title={t('secretNote.sealedTitle', { name })} hint={t('secretNote.sealedHint')} />
              </Animated.View>
            )}
          </Animated.View>

          <Animated.View layout={GLIDE}>
            <GroupLabel>{t('secretNote.yourNote')}</GroupLabel>
          </Animated.View>
          <Animated.View layout={GLIDE} style={[featureStyles.card, styles.pad]}>
            <TextInput
              value={note.myNote}
              onChangeText={(text) => writeNote(note.id, text.slice(0, MAX_LENGTH))}
              placeholder={t('secretNote.placeholder')}
              placeholderTextColor={systemGround.secondaryLabel}
              style={styles.input}
              multiline
              editable={!exchanged}
              textAlignVertical="top"
              accessibilityLabel={t('secretNote.yourNote')}
            />
            <Txt style={styles.counter}>{t('secretNote.counter', { count: note.myNote.length })}</Txt>
          </Animated.View>

          {exchanged ? (
            <Animated.View
              entering={justOpened ? FadeInDown.delay(560).duration(320).easing(Easing.bezier(0.23, 1, 0.32, 1)) : undefined}
              style={styles.doneBlock}>
              <View style={styles.done}>
                <Ionicons name="checkmark-circle" size={18} color={colors.bondText} />
                <Txt style={styles.doneText}>{t('secretNote.exchanged')}</Txt>
              </View>
              <PressableScale
                scaleTo={0.95}
                accessibilityRole="button"
                onPress={() => {
                  setJustOpened(false);
                  newSecretNote(character.id);
                }}
                style={[styles.again, { backgroundColor: accent.soft }]}>
                <Ionicons name="refresh" size={16} color={accent.strong} />
                <Txt style={[styles.againText, { color: accent.strong }]}>{t('secretNote.newQuestion')}</Txt>
              </PressableScale>
            </Animated.View>
          ) : null}
        </ScrollView>

        {exchanged ? null : (
          <StoreBuyBar
            label={`${t('secretNote.swap')} · ${shellCosts.secretNote}`}
            left={<ShellIcon size={18} />}
            disabled={!canExchange}
            onPress={exchange}
          />
        )}
      </KeyboardAvoidingView>

      <PaywallSheet need={paywall} onClose={() => setPaywall(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { padding: space.lg },
  prompt: { marginTop: 18, alignItems: 'center', gap: 6, paddingVertical: 22, paddingHorizontal: space.xl },
  promptLabel: { marginTop: 4, fontSize: 13, fontWeight: '600', letterSpacing: 0.2, color: systemGround.secondaryLabel, textTransform: 'uppercase' },
  promptText: { fontSize: 22, lineHeight: 29, fontWeight: '700', letterSpacing: -0.3, color: systemGround.label },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  muted: { fontSize: 13, lineHeight: 18, color: systemGround.secondaryLabel },
  input: { minHeight: 120, padding: 0, fontSize: 17, lineHeight: 24, letterSpacing: -0.3, color: systemGround.label },
  counter: { alignSelf: 'flex-end', marginTop: space.sm, fontSize: 12, color: systemGround.secondaryLabel, fontVariant: ['tabular-nums'] },
  doneBlock: { alignItems: 'center', gap: space.md, marginTop: 22 },
  done: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  doneText: { fontSize: 15, fontWeight: '600', color: colors.bondText },
  again: { height: 40, paddingHorizontal: space.lg, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 },
  againText: { fontSize: 15, fontWeight: '700' },
});
