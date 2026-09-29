import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { PaywallSheet } from '@/components/paywall-sheet';
import { ShellIcon, Anim, Header, PressableScale, Screen, Txt } from '@/components/ui';
import { shellCosts } from '@/mock';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, gradients, palette, radius, shadows, space, type } from '@/theme';

const MAX_LENGTH = 400;

/**
 * Secret Note: a daily question, two sealed notes. The character writes theirs
 * first ("Thinking..."), you write yours, and Exchange opens both at once.
 */
export default function SecretNoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const characterId = Array.isArray(id) ? id[0] : id;

  const { t } = useTranslation();

  const user = useAppStore((s) => s.user);
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

  if (!character || !note) {
    return (
      <Screen background={gradients.secretNote}>
        <Header title={t('secretNote.title')} center />
      </Screen>
    );
  }

  const exchanged = note.status === 'exchanged';
  const composing = note.status === 'composing';
  const canExchange = note.status === 'ready' && note.myNote.trim().length > 0;

  const exchange = () => {
    const result = exchangeNote(note.id);
    if (result === 'noShells') setPaywall(shellCosts.secretNote);
    if (result === 'ok') setJustOpened(true);
  };

  return (
    <Screen background={gradients.secretNote}>
      <Header title={t('secretNote.title')} center />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled">
          <View style={[styles.card, shadows.card]}>
            <View style={styles.cardHead}>
              <Txt variant="bodyStrong">{t('secretNote.theirNote', { name: displayName(character, relationship) })}</Txt>
            </View>
            <View style={styles.cardBody}>
              {exchanged ? (
                <>
                  {justOpened ? <Anim name="loveLetter" size={120} loop={false} style={styles.letter} /> : null}
                  <Txt variant="body">{note.theirNote}</Txt>
                </>
              ) : composing ? (
                <View style={styles.status}>
                  <Txt variant="small" color={colors.textMuted}>
                    {t('secretNote.thinking')}
                  </Txt>
                  <Anim name="typing" size={26} tint={colors.accent} />
                </View>
              ) : (
                <View style={styles.sealed}>
                  <Ionicons name="mail" size={34} color={palette.mint400} />
                  <Txt variant="small" color={colors.textMuted} center>
                    {t('secretNote.sealed')}
                  </Txt>
                </View>
              )}
            </View>
          </View>

          <View style={styles.prompt}>
            <Ionicons name="attach" size={20} color={palette.mint500} style={styles.clipTopLeft} />
            <Txt variant="small" color={palette.mint500} lines={2} center style={styles.promptText}>
              {note.prompt}
            </Txt>
            <Ionicons name="attach" size={20} color={palette.mint500} style={styles.clipBottomRight} />
          </View>

          <View style={[styles.card, shadows.card]}>
            <View style={styles.cardHead}>
              <Txt variant="bodyStrong">{t('secretNote.myNote', { name: user.displayName })}</Txt>
            </View>
            <View style={styles.cardBody}>
              <TextInput
                value={note.myNote}
                onChangeText={(text) => writeNote(note.id, text.slice(0, MAX_LENGTH))}
                placeholder={t('secretNote.placeholder')}
                placeholderTextColor={colors.textFaint}
                style={styles.input}
                multiline
                editable={!exchanged}
                textAlignVertical="top"
              />

              <View style={styles.footer}>
                <Txt variant="caption" color={colors.textFaint}>
                  {t('secretNote.counter', { count: note.myNote.length })}
                </Txt>
                {exchanged ? (
                  <View style={styles.done}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
                    <Txt variant="smallStrong" color={colors.accent}>
                      {t('secretNote.exchanged')}
                    </Txt>
                  </View>
                ) : (
                  <PressableScale
                    style={[styles.exchange, canExchange && styles.exchangeActive]}
                    disabled={!canExchange}
                    onPress={exchange}
                    scaleTo={0.94}>
                    <Txt variant="smallStrong" color={canExchange ? colors.white : palette.mint400}>
                      {t('secretNote.exchange')}
                    </Txt>
                    <ShellIcon size={13} />
                    <Txt variant="caption" color={canExchange ? colors.white : palette.mint400}>
                      {shellCosts.secretNote}
                    </Txt>
                  </PressableScale>
                )}
              </View>
            </View>
          </View>

          {exchanged ? (
            <PressableScale
              style={styles.newQuestion}
              scaleTo={0.96}
              onPress={() => {
                setJustOpened(false);
                newSecretNote(character.id);
              }}>
              <Ionicons name="refresh" size={16} color={colors.accent} />
              <Txt variant="smallStrong" color={colors.accent}>
                {t('secretNote.newQuestion')}
              </Txt>
            </PressableScale>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <PaywallSheet need={paywall} onClose={() => setPaywall(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: space.lg, gap: space.lg, paddingBottom: space.huge },
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  cardHead: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    backgroundColor: palette.mint50,
    borderBottomWidth: 1,
    borderBottomColor: palette.mint100,
  },
  cardBody: { padding: space.lg, minHeight: 170 },
  status: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: space.xs },
  sealed: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.sm },
  letter: { alignSelf: 'center', marginTop: -space.md },
  prompt: {
    justifyContent: 'center',
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.mint200,
    backgroundColor: palette.mint50,
  },
  promptText: { fontStyle: 'italic' },
  clipTopLeft: { position: 'absolute', top: -8, left: 4, transform: [{ rotate: '-35deg' }] },
  clipBottomRight: { position: 'absolute', bottom: -8, right: 4, transform: [{ rotate: '145deg' }] },
  input: {
    minHeight: 110,
    padding: 0,
    color: colors.text,
    ...type.body,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.lg,
  },
  exchange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space.lg,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: palette.mint100,
  },
  exchangeActive: { backgroundColor: palette.mint500 },
  done: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  newQuestion: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.lg,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: palette.mint200,
  },
});
