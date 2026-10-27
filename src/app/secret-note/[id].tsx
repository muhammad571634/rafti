import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PaywallSheet } from '@/components/paywall-sheet';
import { BUY_BAR_SPACE, CARD_SHADOW, GroupLabel, STORE, StoreBuyBar } from '@/components/plans/store-look';
import { Anim, AuroraGlass, CharacterAvatar, EmptyState, LargeTitle, PressableScale, Screen, ShellIcon, Txt } from '@/components/ui';
import { shellCosts } from '@/mock';
import { displayName, useAppStore } from '@/store/use-app-store';
import { aurora, colors, isDark, space } from '@/theme';

const MAX_LENGTH = 400;
/** The sealed note's lock: mint, the bond colour. */
const LOCK_BG = isDark ? 'rgba(48,209,88,0.18)' : '#E3F7EF';

/**
 * Secret Note: a daily question, two sealed notes. The character writes theirs first
 * ("Thinking..."), you write yours, and one swap opens both at once. iOS look on the aurora
 * (2026-10-22, coded at the owner's word): the question as a card with the friend's face, their
 * note sealed in a card, yours as a field, and the Store's bar for the swap.
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

  const [paywall, setPaywall] = useState<number | null>(null);
  const [justOpened, setJustOpened] = useState(false);

  const note = useMemo(() => notes.find((n) => n.characterId === characterId), [notes, characterId]);

  useEffect(() => {
    if (characterId) ensureSecretNote(characterId);
  }, [characterId, ensureSecretNote]);

  const bar = (
    <View style={styles.bar}>
      <PressableScale scaleTo={0.9} accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()}>
        <AuroraGlass style={styles.round}>
          <Ionicons name="chevron-back" size={22} color={colors.text} style={styles.backIcon} />
        </AuroraGlass>
      </PressableScale>
    </View>
  );

  if (!character || !note) {
    return (
      <Screen background="aurora">
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

  const exchange = () => {
    const result = exchangeNote(note.id);
    if (result === 'noShells') setPaywall(shellCosts.secretNote);
    if (result === 'ok') setJustOpened(true);
  };

  return (
    <Screen background="aurora">
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: exchanged ? insets.bottom + space.xxl : BUY_BAR_SPACE }}
          keyboardShouldPersistTaps="handled">
          {bar}
          <LargeTitle>{t('secretNote.title')}</LargeTitle>

          <View style={[styles.card, styles.prompt]}>
            <CharacterAvatar character={character} size={44} />
            <Txt style={styles.promptLabel}>{t('secretNote.question')}</Txt>
            <Txt style={styles.promptText} center>
              {`“${note.prompt}”`}
            </Txt>
          </View>

          <GroupLabel>{t('secretNote.theirNote', { name })}</GroupLabel>
          <View style={[styles.card, styles.pad]}>
            {exchanged ? (
              <>
                {justOpened ? <Anim name="loveLetter" size={120} loop={false} style={styles.letter} /> : null}
                <Txt style={styles.noteText}>{note.theirNote}</Txt>
              </>
            ) : composing ? (
              <View style={styles.row}>
                <Anim name="typing" size={26} tint={aurora.tint} />
                <Txt style={styles.muted}>{t('secretNote.thinking')}</Txt>
              </View>
            ) : (
              <View style={styles.row}>
                <View style={styles.lock}>
                  <Ionicons name="lock-closed" size={18} color={colors.bondText} />
                </View>
                <View style={styles.flex}>
                  <Txt style={styles.sealed}>{t('secretNote.sealedTitle', { name })}</Txt>
                  <Txt style={styles.muted}>{t('secretNote.sealedHint')}</Txt>
                </View>
              </View>
            )}
          </View>

          <GroupLabel>{t('secretNote.yourNote')}</GroupLabel>
          <View style={[styles.card, styles.pad]}>
            <TextInput
              value={note.myNote}
              onChangeText={(text) => writeNote(note.id, text.slice(0, MAX_LENGTH))}
              placeholder={t('secretNote.placeholder')}
              placeholderTextColor={aurora.textMuted}
              style={styles.input}
              multiline
              editable={!exchanged}
              textAlignVertical="top"
              accessibilityLabel={t('secretNote.yourNote')}
            />
            <Txt style={styles.counter}>{t('secretNote.counter', { count: note.myNote.length })}</Txt>
          </View>

          {exchanged ? (
            <View style={styles.doneBlock}>
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
                style={styles.again}>
                <Ionicons name="refresh" size={16} color={STORE.peachInk} />
                <Txt style={styles.againText}>{t('secretNote.newQuestion')}</Txt>
              </PressableScale>
            </View>
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
  bar: { height: 44, paddingHorizontal: space.lg, paddingTop: space.xs, flexDirection: 'row', alignItems: 'center' },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  backIcon: { marginLeft: -2 },
  card: { marginHorizontal: space.lg, borderRadius: 20, backgroundColor: aurora.card, ...CARD_SHADOW },
  pad: { padding: space.lg },
  prompt: { marginTop: 18, alignItems: 'center', gap: 6, paddingVertical: 22, paddingHorizontal: space.xl },
  promptLabel: { marginTop: 4, fontSize: 13, fontWeight: '600', letterSpacing: 0.2, color: aurora.textMuted, textTransform: 'uppercase' },
  promptText: { fontSize: 22, lineHeight: 29, fontWeight: '700', letterSpacing: -0.3, color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lock: { width: 38, height: 38, borderRadius: 10, backgroundColor: LOCK_BG, alignItems: 'center', justifyContent: 'center' },
  sealed: { fontSize: 17, fontWeight: '600', letterSpacing: -0.4, color: colors.text },
  muted: { fontSize: 13, lineHeight: 18, color: aurora.textMuted },
  letter: { alignSelf: 'center', marginTop: -space.md },
  noteText: { fontSize: 17, lineHeight: 24, letterSpacing: -0.3, color: colors.text },
  input: { minHeight: 120, padding: 0, fontSize: 17, lineHeight: 24, letterSpacing: -0.3, color: colors.text },
  counter: { alignSelf: 'flex-end', marginTop: space.sm, fontSize: 12, color: aurora.textMuted, fontVariant: ['tabular-nums'] },
  doneBlock: { alignItems: 'center', gap: space.md, marginTop: 22 },
  done: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  doneText: { fontSize: 15, fontWeight: '600', color: colors.bondText },
  again: {
    height: 40,
    paddingHorizontal: space.lg,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: STORE.peachSoft,
  },
  againText: { fontSize: 15, fontWeight: '700', color: STORE.peachInk },
});
